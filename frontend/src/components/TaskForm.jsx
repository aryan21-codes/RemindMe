import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Bell, RefreshCw, Loader2 } from 'lucide-react';

export default function TaskForm({ task = null, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '',
    recurrence: 'none',
    reminder_type: 'due_time',
    reminder_offset: '10', // default to 10 mins before
    custom_reminder_time: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      // Set existing task values when editing
      setFormData({
        title: task.title || '',
        description: task.description || '',
        due_date: task.due_date || '',
        due_time: task.due_time || '',
        recurrence: task.recurrence || 'none',
        reminder_type: task.reminder_type || 'due_time',
        reminder_offset: task.reminder_offset !== null ? String(task.reminder_offset) : '10',
        custom_reminder_time: task.custom_reminder_time ? task.custom_reminder_time.replace(' ', 'T') : ''
      });
    } else {
      // Initialize with default date/time (today + 1 hour)
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const todayStr = now.toISOString().split('T')[0];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      setFormData(prev => ({
        ...prev,
        due_date: todayStr,
        due_time: `${hours}:${minutes}`
      }));
    }
  }, [task]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    if (!formData.title.trim()) {
      setError('Task title is required.');
      return false;
    }
    if (!formData.due_date) {
      setError('Due date is required.');
      return false;
    }
    if (!formData.due_time) {
      setError('Due time is required.');
      return false;
    }
    if (formData.reminder_type === 'custom' && !formData.custom_reminder_time) {
      setError('Custom reminder date & time is required.');
      return false;
    }
    
    // Check if custom reminder is after the task due time
    if (formData.reminder_type === 'custom') {
      const due = new Date(`${formData.due_date}T${formData.due_time}:00`);
      const custom = new Date(formData.custom_reminder_time);
      if (custom > due) {
        setError('Reminder cannot be set after the task is due.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setSaving(true);
    
    // Format request payload
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      due_date: formData.due_date,
      due_time: formData.due_time,
      recurrence: formData.recurrence,
      reminder_type: formData.reminder_type,
      reminder_offset: formData.reminder_type === 'offset' ? parseInt(formData.reminder_offset, 10) : null,
      custom_reminder_time: formData.reminder_type === 'custom' 
        ? formData.custom_reminder_time.replace('T', ' ') 
        : null
    };

    const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
    const method = task ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save the task.');
      }
    } catch (err) {
      setError('Connection failure. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-darkBorder flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-darkBorder">
          <h3 className="text-lg font-bold text-slate-100">
            {task ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-darkBorder/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-grow">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Team Synch Meeting"
              className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide a brief context or notes..."
              rows="3"
              className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-400" /> Due Date *
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" /> Due Time *
              </label>
              <input
                type="time"
                name="due_time"
                value={formData.due_time}
                onChange={handleInputChange}
                className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Recurrence Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400" /> Recurrence
            </label>
            <select
              name="recurrence"
              value={formData.recurrence}
              onChange={handleInputChange}
              className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
            >
              <option value="none">Does not repeat (One-time)</option>
              <option value="daily">Repeats Daily</option>
              <option value="weekly">Repeats Weekly</option>
            </select>
          </div>

          {/* Reminder Section */}
          <div className="border-t border-darkBorder/60 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-violet-400" /> Notification Alert Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400">
                  Reminder Option
                </label>
                <select
                  name="reminder_type"
                  value={formData.reminder_type}
                  onChange={handleInputChange}
                  className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
                >
                  <option value="due_time">At the due time</option>
                  <option value="offset">Time offset before due</option>
                  <option value="custom">Custom date & time</option>
                </select>
              </div>

              {formData.reminder_type === 'offset' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">
                    How much time before?
                  </label>
                  <select
                    name="reminder_offset"
                    value={formData.reminder_offset}
                    onChange={handleInputChange}
                    className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
                  >
                    <option value="5">5 minutes before</option>
                    <option value="10">10 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="120">2 hours before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>
              )}

              {formData.reminder_type === 'custom' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Reminder Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="custom_reminder_time"
                    value={formData.custom_reminder_time}
                    onChange={handleInputChange}
                    className="w-full bg-[#110e22] border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-darkBorder/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-darkCard hover:bg-darkBorder/40 border border-darkBorder text-slate-300 text-sm font-semibold rounded-xl py-3 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-glow disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
