import cron from 'node-cron';
import twilio from 'twilio';
import db from './db.js';

let broadcastFn = null;

// Set the broadcast function to send real-time browser push alerts
export const setBroadcastFn = (fn) => {
  broadcastFn = fn;
};

// Helper: Get a setting value from environment or database
const getSettingVal = async (key) => {
  // Check process.env first (uppercased), then fallback to database settings table
  const envKey = key.toUpperCase();
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  const row = await db.queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
};

// Format Date to local YYYY-MM-DD
const formatDateLocal = (date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

// Format Date to local YYYY-MM-DD HH:MM
const formatDateTimeLocal = (date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  const iso = localDate.toISOString();
  return iso.replace('T', ' ').substring(0, 16);
};

// Helper: Calculate reminder trigger time for a task
const getReminderTime = (task) => {
  // Combine task.due_date (YYYY-MM-DD) and task.due_time (HH:MM)
  const dueDateTime = new Date(`${task.due_date}T${task.due_time}:00`);

  if (isNaN(dueDateTime.getTime())) {
    return null;
  }

  if (task.reminder_type === 'due_time') {
    return dueDateTime;
  } else if (task.reminder_type === 'offset') {
    const offsetMin = parseInt(task.reminder_offset, 10) || 0;
    return new Date(dueDateTime.getTime() - offsetMin * 60 * 1000);
  } else if (task.reminder_type === 'custom') {
    if (!task.custom_reminder_time) return dueDateTime;
    // custom_reminder_time is stored as YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM
    const normalizedTime = task.custom_reminder_time.replace(' ', 'T');
    const customTime = new Date(normalizedTime);
    return isNaN(customTime.getTime()) ? dueDateTime : customTime;
  }
  return dueDateTime;
};

// Function to send WhatsApp message via Twilio Sandbox API
export const sendWhatsAppMessage = async (title, dueTime, targetNumber = null) => {
  try {
    const accountSid = await getSettingVal('twilio_account_sid');
    const authToken = await getSettingVal('twilio_auth_token');
    const fromNumber = await getSettingVal('twilio_whatsapp_from');
    const toNumber = targetNumber || await getSettingVal('user_whatsapp_number');

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
      console.warn('WhatsApp notification skipped: Twilio credentials or phone numbers not fully configured.');
      return false;
    }

    const client = twilio(accountSid, authToken);
    const formattedTo = toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`;
    const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    const message = await client.messages.create({
      body: `⏰ Reminder: ${title} is due at ${dueTime}. Don't forget!`,
      from: formattedFrom,
      to: formattedTo
    });

    console.log(`WhatsApp notification sent successfully. SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message via Twilio:', error.message);
    return false;
  }
};

// Periodic checker for tasks due for reminders
const checkReminders = async () => {
  const now = new Date();
  console.log(`[Scheduler] Checking reminders at ${formatDateTimeLocal(now)}...`);

  try {
    // Select all uncompleted tasks with pending reminders
    const tasks = await db.query('SELECT * FROM tasks WHERE completed = 0 AND reminder_sent = 0');

    for (const task of tasks) {
      const triggerTime = getReminderTime(task);
      if (!triggerTime) continue;

      if (triggerTime <= now) {
        console.log(`[Scheduler] Triggering reminder for task ID ${task.id}: "${task.title}"`);

        // 1. Send Twilio WhatsApp notification
        await sendWhatsAppMessage(task.title, task.due_time);

        // 2. Broadcast via SSE to frontend
        if (broadcastFn) {
          broadcastFn({
            type: 'reminder',
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              due_time: task.due_time
            }
          });
        }

        // 3. Mark reminder as sent or handle recurrence
        if (task.recurrence === 'daily' || task.recurrence === 'weekly') {
          // Advance the due date
          const currentDue = new Date(`${task.due_date}T${task.due_time}:00`);
          const daysToAdd = task.recurrence === 'daily' ? 1 : 7;
          currentDue.setDate(currentDue.getDate() + daysToAdd);

          const nextDueDateStr = formatDateLocal(currentDue);

          // Advance custom reminder time if set
          let nextCustomReminderStr = null;
          if (task.reminder_type === 'custom' && task.custom_reminder_time) {
            const currentCustom = new Date(task.custom_reminder_time.replace(' ', 'T'));
            currentCustom.setDate(currentCustom.getDate() + daysToAdd);
            nextCustomReminderStr = formatDateTimeLocal(currentCustom);
          }

          console.log(`[Scheduler] Task ${task.id} is recurring (${task.recurrence}). Rolling over to: Due ${nextDueDateStr}, Reminder: ${nextCustomReminderStr || 'Default'}`);

          await db.run(
            'UPDATE tasks SET due_date = ?, custom_reminder_time = ?, reminder_sent = 0 WHERE id = ?',
            [nextDueDateStr, nextCustomReminderStr, task.id]
          );
        } else {
          // Non-recurring task: just mark reminder as sent
          await db.run('UPDATE tasks SET reminder_sent = 1 WHERE id = ?', [task.id]);
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error during reminder checks:', error);
  }
};

// Start the scheduler (runs once every minute)
export const initScheduler = () => {
  cron.schedule('* * * * *', checkReminders);
  console.log('Task reminder background cron job initialized (runs every minute).');
};

export default {
  initScheduler,
  setBroadcastFn,
  sendWhatsAppMessage
};
