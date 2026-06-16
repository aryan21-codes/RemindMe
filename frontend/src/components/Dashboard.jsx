import React, { useState } from 'react';
import { Check, Edit2, Trash2, Calendar, Clock, RefreshCw, Bell, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';

export default function Dashboard({ tasks, onToggleComplete, onEditTask, onDeleteTask, onAddTask }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompletedSection, setShowCompletedSection] = useState(true);

  // Grouping logic
  const now = new Date();
  
  // Format current date as local YYYY-MM-DD
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  const todayStr = localDate.toISOString().split('T')[0];

  const getTaskDateTime = (task) => {
    return new Date(`${task.due_date}T${task.due_time}:00`);
  };

  const filteredTasks = tasks.filter(task => {
    const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  const overdue = filteredTasks.filter(t => !t.completed && getTaskDateTime(t) < now);
  
  // Due today but not overdue (i.e. due later today) OR due today but already overdue (show in overdue)
  // Let's keep Today simple: due date is today and not completed. If it is due today and in the past, it's overdue.
  // To avoid confusion, let's put it in Overdue if past, and Today if due today but in the future.
  const today = filteredTasks.filter(t => !t.completed && t.due_date === todayStr && getTaskDateTime(t) >= now);
  const upcoming = filteredTasks.filter(t => !t.completed && t.due_date > todayStr);
  const completed = filteredTasks.filter(t => t.completed);

  // Stat numbers
  const totalPending = tasks.filter(t => !t.completed).length;
  const totalOverdue = tasks.filter(t => !t.completed && getTaskDateTime(t) < now).length;
  const totalToday = tasks.filter(t => !t.completed && t.due_date === todayStr && getTaskDateTime(t) >= now).length;
  const totalCompleted = tasks.filter(t => t.completed).length;

  const renderReminderBadge = (task) => {
    if (task.reminder_type === 'due_time') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
          <Bell className="w-2.5 h-2.5" /> Due Time
        </span>
      );
    } else if (task.reminder_type === 'offset') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-violet-950/40 text-violet-300 px-2 py-0.5 rounded-full border border-violet-800/40">
          <Bell className="w-2.5 h-2.5" /> {task.reminder_offset} min before
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-pink-950/40 text-pink-300 px-2 py-0.5 rounded-full border border-pink-800/40">
          <Bell className="w-2.5 h-2.5" /> Custom Time
        </span>
      );
    }
  };

  const renderRecurrenceBadge = (task) => {
    if (task.recurrence === 'none') return null;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800/40">
        <RefreshCw className="w-2.5 h-2.5" /> {task.recurrence}
      </span>
    );
  };

  const TaskCard = ({ task, isOverdue = false }) => {
    const isTaskOverdue = !task.completed && getTaskDateTime(task) < now;
    return (
      <div className="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all relative overflow-hidden group">
        {/* Card Header & Checkbox */}
        <div className="flex gap-3 items-start">
          <button
            onClick={() => onToggleComplete(task)}
            className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
              task.completed
                ? 'bg-emerald-500 border-emerald-400 text-white'
                : isTaskOverdue
                ? 'border-rose-500/40 hover:border-rose-400 hover:bg-rose-500/10 text-transparent'
                : 'border-darkBorder hover:border-violet-500 hover:bg-violet-500/10 text-transparent'
            }`}
          >
            <Check className="w-4 h-4 text-slate-100" />
          </button>
          
          <div className="flex-grow space-y-1">
            <h4 className={`font-semibold text-sm leading-snug break-words ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className={`text-xs line-clamp-2 leading-relaxed ${task.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="border-t border-darkBorder/40 pt-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Due Badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
              task.completed 
                ? 'bg-slate-800/40 text-slate-500 border-slate-700/30'
                : isTaskOverdue 
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/40' 
                : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40'
            }`}>
              <Calendar className="w-2.5 h-2.5" />
              {task.due_date} {task.due_time}
            </span>

            {!task.completed && (
              <>
                {renderReminderBadge(task)}
                {renderRecurrenceBadge(task)}
              </>
            )}
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-auto">
            {!task.completed && (
              <button
                onClick={() => onEditTask(task)}
                className="p-1.5 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                title="Edit Task"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Search & Actions Banner */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-darkCard border border-darkBorder focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={onAddTask}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl px-5 py-2.5 transition-glow"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold">
            {totalPending}
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</h5>
            <p className="text-lg font-bold text-slate-200">{totalPending} tasks</p>
          </div>
        </div>
        
        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
            {totalOverdue}
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue</h5>
            <p className="text-lg font-bold text-slate-200">{totalOverdue} tasks</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
            {totalToday}
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</h5>
            <p className="text-lg font-bold text-slate-200">{totalToday} tasks</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            {totalCompleted}
          </div>
          <div>
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</h5>
            <p className="text-lg font-bold text-slate-200">{totalCompleted} tasks</p>
          </div>
        </div>
      </div>

      {/* Task Dashboard Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Overdue column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
              Overdue <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full">{overdue.length}</span>
            </h3>
          </div>
          {overdue.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 text-xs">
              No overdue tasks
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {overdue.map(task => (
                <TaskCard key={task.id} task={task} isOverdue={true} />
              ))}
            </div>
          )}
        </div>

        {/* Today column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-violet-500/10 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
              Today <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{today.length}</span>
            </h3>
          </div>
          {today.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 text-xs">
              No pending tasks for today
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {today.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="font-bold text-slate-200 text-sm tracking-wide uppercase flex items-center gap-2">
              Upcoming <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{upcoming.length}</span>
            </h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 text-xs">
              No upcoming tasks
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {upcoming.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Completed Section (collapsible) */}
      <div className="border-t border-darkBorder/60 pt-6">
        <button
          onClick={() => setShowCompletedSection(!showCompletedSection)}
          className="flex items-center justify-between w-full hover:bg-darkCard/30 p-3 rounded-xl transition-colors border border-darkBorder/40"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-300 text-xs tracking-wide uppercase">
              Completed Tasks ({completed.length})
            </span>
          </div>
          {showCompletedSection ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showCompletedSection && (
          <div className="mt-4">
            {completed.length === 0 ? (
              <div className="text-center text-xs text-slate-600 py-4">
                Completed tasks will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto pr-1">
                {completed.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
