import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Settings as SettingsIcon, Bell, BellOff, BellRing, CheckSquare, Loader2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import TaskForm from './components/TaskForm';
import { API_BASE } from './config';


export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'settings'
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeEditTask, setActiveEditTask] = useState(null);
  
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    // 1. Fetch tasks
    fetchTasks();

    // 2. Request Notification Permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // 3. Setup Server-Sent Events (SSE) for Browser Push Reminders
    const sseUrl = `${window.location.origin}${API_BASE}/events`;
    console.log(`[SSE] Connecting to: ${sseUrl}`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened successfully.');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Message received:', data);
        if (data.type === 'reminder') {
          triggerBrowserAlert(data.task);
          fetchTasks(); // Refresh tasks list to reflect updated states / rollovers
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error occurred:', err);
    };

    // Clean up EventSource on unmount
    return () => {
      eventSource.close();
      console.log('[SSE] Connection closed.');
    };
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        console.error('Failed to load tasks from server.');
      }
    } catch (err) {
      console.error('Connection error while fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const triggerBrowserAlert = (task) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`⏰ Task Reminder!`, {
        body: `"${task.title}" is due at ${task.due_time}.`,
        tag: `task-${task.id}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      // Fallback custom alert if browser notifications are disabled
      alert(`⏰ Reminder: "${task.title}" is due at ${task.due_time}!`);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ completed: task.completed === 1 ? 0 : 1 })
      });
      if (res.ok) {
        fetchTasks();
      } else {
        console.error('Failed to toggle completion status.');
      }
    } catch (err) {
      console.error('Error updating task completion:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTasks();
      } else {
        console.error('Failed to delete task.');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleEditTask = (task) => {
    setActiveEditTask(task);
    setShowTaskForm(true);
  };

  const handleAddTask = () => {
    setActiveEditTask(null);
    setShowTaskForm(true);
  };

  const handleFormSuccess = () => {
    setShowTaskForm(false);
    setActiveEditTask(null);
    fetchTasks();
  };

  const handleFormClose = () => {
    setShowTaskForm(false);
    setActiveEditTask(null);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  };

  const renderNotificationStatus = () => {
    if (notificationPermission === 'granted') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <BellRing className="w-3.5 h-3.5" /> Push Alerts Enabled
        </span>
      );
    } else if (notificationPermission === 'denied') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
          <BellOff className="w-3.5 h-3.5" /> Alerts Blocked
        </span>
      );
    }
    return (
      <button
        onClick={requestNotificationPermission}
        className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
      >
        <Bell className="w-3.5 h-3.5" /> Allow Push Alerts
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar Header */}
      <header className="border-b border-darkBorder bg-[#141029]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100 m-0">
              Remind<span className="text-violet-400">Me</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {renderNotificationStatus()}
            
            {/* Navigation Tabs */}
            <nav className="flex items-center bg-[#0b0818] border border-darkBorder rounded-xl p-1">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  view === 'dashboard'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                onClick={() => setView('settings')}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  view === 'settings'
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingTasks && tasks.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : view === 'dashboard' ? (
          <Dashboard
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        ) : (
          <Settings />
        )}
      </main>

      {/* App Footer */}
      <footer className="border-t border-darkBorder/40 bg-[#0c0919] py-6 text-center text-xs text-slate-500">
        <p>© 2026 RemindMe Application. All rights reserved.</p>
      </footer>

      {/* Task Modal Overlay */}
      {showTaskForm && (
        <TaskForm
          task={activeEditTask}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
