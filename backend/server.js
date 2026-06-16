import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import { initScheduler, setBroadcastFn, sendWhatsAppMessage } from './scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// List of connected SSE clients
let sseClients = [];

// SSE Event Stream for Browser Notifications
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Keep-alive heartbeat
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  const client = { id: Date.now(), res };
  sseClients.push(client);
  console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter(c => c.id !== client.id);
    console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
  });
});

// Broadcast function to notify all connected browsers
const broadcastToBrowsers = (data) => {
  sseClients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

// Hook scheduler up to browser SSE broadcasts
setBroadcastFn(broadcastToBrowsers);

// API: Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await db.query('SELECT * FROM tasks ORDER BY due_date ASC, due_time ASC');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Add a task
app.post('/api/tasks', async (req, res) => {
  const {
    title,
    description,
    due_date,
    due_time,
    recurrence = 'none',
    reminder_type = 'due_time',
    reminder_offset = null,
    custom_reminder_time = null
  } = req.body;

  if (!title || !due_date || !due_time) {
    return res.status(400).json({ error: 'Title, due date, and due time are required.' });
  }

  try {
    const sql = `
      INSERT INTO tasks (title, description, due_date, due_time, recurrence, reminder_type, reminder_offset, custom_reminder_time, reminder_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    const params = [title, description, due_date, due_time, recurrence, reminder_type, reminder_offset, custom_reminder_time];
    const result = await db.run(sql, params);

    const newTask = await db.queryOne('SELECT * FROM tasks WHERE id = ?', [result.id]);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Update a task
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    due_date,
    due_time,
    completed,
    recurrence,
    reminder_type,
    reminder_offset,
    custom_reminder_time
  } = req.body;

  try {
    const currentTask = await db.queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Determine if we need to reset the reminder alert
    // Reset if target due dates change or task is marked as incomplete from complete
    let reminder_sent = currentTask.reminder_sent;
    if (
      currentTask.completed === 1 && completed === 0 ||
      currentTask.due_date !== due_date ||
      currentTask.due_time !== due_time ||
      currentTask.reminder_type !== reminder_type ||
      currentTask.reminder_offset !== reminder_offset ||
      currentTask.custom_reminder_time !== custom_reminder_time
    ) {
      reminder_sent = 0;
    }

    const sql = `
      UPDATE tasks 
      SET title = ?, description = ?, due_date = ?, due_time = ?, completed = ?, recurrence = ?, reminder_type = ?, reminder_offset = ?, custom_reminder_time = ?, reminder_sent = ?
      WHERE id = ?
    `;
    const params = [
      title !== undefined ? title : currentTask.title,
      description !== undefined ? description : currentTask.description,
      due_date !== undefined ? due_date : currentTask.due_date,
      due_time !== undefined ? due_time : currentTask.due_time,
      completed !== undefined ? completed : currentTask.completed,
      recurrence !== undefined ? recurrence : currentTask.recurrence,
      reminder_type !== undefined ? reminder_type : currentTask.reminder_type,
      reminder_offset !== undefined ? reminder_offset : currentTask.reminder_offset,
      custom_reminder_time !== undefined ? custom_reminder_time : currentTask.custom_reminder_time,
      reminder_sent,
      id
    ];

    await db.run(sql, params);
    const updatedTask = await db.queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.run('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get current settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM settings');
    const settingsMap = {};
    rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    // Merge database settings with process.env if present
    const config = {
      twilio_account_sid: settingsMap.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID || '',
      twilio_auth_token: settingsMap.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN || '',
      twilio_whatsapp_from: settingsMap.twilio_whatsapp_from || process.env.TWILIO_WHATSAPP_FROM || '',
      user_whatsapp_number: settingsMap.user_whatsapp_number || process.env.USER_WHATSAPP_NUMBER || ''
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Save settings
app.post('/api/settings', async (req, res) => {
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    }
    res.json({ message: 'Settings saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Test WhatsApp integration
app.post('/api/test-whatsapp', async (req, res) => {
  const { phone_number } = req.body;
  try {
    const success = await sendWhatsAppMessage('Test Task Reminder', '12:00 PM', phone_number);
    if (success) {
      res.json({ success: true, message: 'Test message sent. Check your WhatsApp.' });
    } else {
      res.status(400).json({ success: false, error: 'Could not send test message. Check your Twilio settings.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize database and start servers
const start = async () => {
  try {
    await db.initDb();
    initScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Critical server startup failure:', error);
    process.exit(1);
  }
};

start();
