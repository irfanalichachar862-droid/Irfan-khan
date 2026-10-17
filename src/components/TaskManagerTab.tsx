import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  History,
  ListChecks,
  Pause,
  Play,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Square,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegisteredTag, TimePeriod } from '../utils/antiCheatRules';
import {
  SubTaskItem,
  TaskCategory,
  TaskHistoryAction,
  TaskHistoryEntry,
  TaskItem,
  TaskPriority,
  TaskStatus,
  calculateSubtaskProgress,
  computeTaskAnalytics,
  createHistoryEntry,
  filterAndSortTasks,
  formatTrackedDuration,
} from '../utils/taskManagerRules';

interface TaskManagerTabProps {
  tasks: TaskItem[];
  history: TaskHistoryEntry[];
  registeredTags: RegisteredTag[];
  onUpdateTasks: (tasks: TaskItem[]) => void;
  onUpdateHistory: (history: TaskHistoryEntry[]) => void;
  externalCreateTrigger?: number;
}

const CATEGORIES: TaskCategory[] = [
  'Morning Routine',
  'Work & Study',
  'Health & Fitness',
  'Household',
  'Personal',
];

export const TaskManagerTab: React.FC<TaskManagerTabProps> = ({
  tasks,
  history,
  registeredTags,
  onUpdateTasks,
  onUpdateHistory,
  externalCreateTrigger = 0,
}) => {
  const [subView, setSubView] = useState<'tasks' | 'tracker' | 'history'>('tasks');

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TaskCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<'all' | TaskHistoryAction>('all');

  // Live Task Tracker States
  const [activeTrackingTaskId, setActiveTrackingTaskId] = useState<string | null>(() => {
    const inProg = tasks.find((t) => t.status === 'in_progress');
    return inProg ? inProg.id : tasks[0]?.id || null;
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  // Create / Edit Task Modal State
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Form States inside Modal
  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('Morning Routine');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [hour12, setHour12] = useState<number>(7);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<TimePeriod>('AM');
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(25);
  const [isRecurringDaily, setIsRecurringDaily] = useState<boolean>(true);
  const [linkedTagId, setLinkedTagId] = useState<string>('');
  const [subtasks, setSubtasks] = useState<SubTaskItem[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState<string>('');

  // Live Tracking Interval
  useEffect(() => {
    if (!isTimerRunning || !activeTrackingTaskId) return;

    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
      onUpdateTasks(
        tasks.map((t) =>
          t.id === activeTrackingTaskId
            ? {
                ...t,
                status: t.status === 'completed' ? 'completed' : 'in_progress',
                trackedSeconds: (t.trackedSeconds || 0) + 1,
              }
            : t
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, activeTrackingTaskId, tasks, onUpdateTasks]);

  const analytics = computeTaskAnalytics(tasks);
  const filteredTasks = filterAndSortTasks(tasks, {
    status: statusFilter,
    category: categoryFilter,
    priority: priorityFilter,
    searchQuery,
  });

  const activeTrackedTask =
    tasks.find((t) => t.id === activeTrackingTaskId) || tasks[0] || null;

  const logHistory = (
    task: TaskItem,
    action: TaskHistoryAction,
    details: string,
    durationSec?: number
  ) => {
    const entry = createHistoryEntry(task, action, details, durationSec);
    onUpdateHistory([entry, ...history]);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setNotes('');
    setCategory('Morning Routine');
    setPriority('high');
    setHour12(7);
    setMinute(30);
    setPeriod('AM');
    setDueDate(new Date().toISOString().split('T')[0]);
    setEstimatedMinutes(25);
    setIsRecurringDaily(true);
    setLinkedTagId('');
    setSubtasks([]);
    setNewSubtaskText('');
    setShowTaskModal(true);
  };

  useEffect(() => {
    if (externalCreateTrigger > 0) {
      openCreateModal();
    }
  }, [externalCreateTrigger]);

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setTitle(task.title);
    setNotes(task.notes);
    setCategory(task.category);
    setPriority(task.priority);

    // Parse "07:30 AM"
    const match = task.dueTime12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      setHour12(parseInt(match[1], 10));
      setMinute(parseInt(match[2], 10));
      setPeriod(match[3].toUpperCase() as TimePeriod);
    } else {
      setHour12(8);
      setMinute(0);
      setPeriod('AM');
    }

    setDueDate(task.dueDate || new Date().toISOString().split('T')[0]);
    setEstimatedMinutes(task.estimatedMinutes || 25);
    setIsRecurringDaily(task.isRecurringDaily);
    setLinkedTagId(task.linkedTagId || '');
    setSubtasks(task.subtasks || []);
    setNewSubtaskText('');
    setShowTaskModal(true);
  };

  const handleAddSubtaskInModal = () => {
    if (!newSubtaskText.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: newSubtaskText.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskText('');
  };

  const handleSaveTaskModal = () => {
    if (!title.trim()) return;
    const formattedTime12h = `${hour12.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')} ${period}`;

    if (editingTask) {
      const updatedTask: TaskItem = {
        ...editingTask,
        title: title.trim(),
        notes: notes.trim(),
        category,
        priority,
        dueTime12h: formattedTime12h,
        dueDate,
        estimatedMinutes,
        isRecurringDaily,
        linkedTagId: linkedTagId || undefined,
        subtasks,
      };
      onUpdateTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));
    } else {
      const newTask: TaskItem = {
        id: `task_${Date.now()}`,
        title: title.trim(),
        notes: notes.trim(),
        category,
        priority,
        status: 'pending',
        dueTime12h: formattedTime12h,
        dueDate,
        estimatedMinutes,
        trackedSeconds: 0,
        isRecurringDaily,
        linkedTagId: linkedTagId || undefined,
        subtasks,
        createdAt: Date.now(),
      };
      onUpdateTasks([newTask, ...tasks]);
      logHistory(
        newTask,
        'created',
        `Created task (${newTask.category} · Due ${newTask.dueTime12h})`
      );
      if (!activeTrackingTaskId) {
        setActiveTrackingTaskId(newTask.id);
      }
    }

    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleToggleComplete = (task: TaskItem) => {
    const isNowCompleted = task.status !== 'completed';
    if (isNowCompleted && activeTrackingTaskId === task.id && isTimerRunning) {
      setIsTimerRunning(false);
    }

    const updated: TaskItem = {
      ...task,
      status: isNowCompleted ? 'completed' : 'pending',
      completedAt: isNowCompleted ? Date.now() : undefined,
      subtasks: isNowCompleted
        ? task.subtasks.map((s) => ({ ...s, completed: true }))
        : task.subtasks,
    };

    onUpdateTasks(tasks.map((t) => (t.id === task.id ? updated : t)));

    if (isNowCompleted) {
      logHistory(
        updated,
        'completed',
        `Completed task (${formatTrackedDuration(updated.trackedSeconds)} tracked)`,
        updated.trackedSeconds
      );
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#4ADEDE', '#64CCC5', '#7DE2D1'],
        });
      } catch (_) {}
    } else {
      logHistory(updated, 'reopened', 'Reopened task for active tracking');
    }
  };

  const handleToggleSubtask = (task: TaskItem, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    const allCompleted =
      updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);

    const updatedTask: TaskItem = {
      ...task,
      subtasks: updatedSubtasks,
      status: allCompleted
        ? 'completed'
        : task.status === 'completed'
        ? 'in_progress'
        : task.status,
      completedAt: allCompleted ? Date.now() : undefined,
    };

    onUpdateTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
    if (allCompleted && task.status !== 'completed') {
      logHistory(
        updatedTask,
        'completed',
        `Completed all ${updatedSubtasks.length} checklist items`,
        updatedTask.trackedSeconds
      );
    }
  };

  const handleStartLiveTracking = (task: TaskItem) => {
    if (activeTrackingTaskId === task.id && isTimerRunning) {
      // Pause
      setIsTimerRunning(false);
      logHistory(
        task,
        'paused_tracking',
        `Paused focus timer after ${formatTrackedDuration(sessionSeconds)} session`,
        sessionSeconds
      );
      return;
    }

    setActiveTrackingTaskId(task.id);
    setSessionSeconds(0);
    setIsTimerRunning(true);

    if (task.status === 'pending') {
      const updated: TaskItem = { ...task, status: 'in_progress' };
      onUpdateTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    }

    logHistory(task, 'started_tracking', 'Started live focus timer session');
    setSubView('tracker');
  };

  const handleDuplicateTask = (task: TaskItem) => {
    const copy: TaskItem = {
      ...task,
      id: `task_${Date.now()}`,
      title: `${task.title} (Copy)`,
      status: 'pending',
      trackedSeconds: 0,
      subtasks: task.subtasks.map((s) => ({
        ...s,
        id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        completed: false,
      })),
      createdAt: Date.now(),
      completedAt: undefined,
    };
    onUpdateTasks([copy, ...tasks]);
    logHistory(copy, 'created', `Duplicated from "${task.title}"`);
  };

  const handleDeleteTask = (task: TaskItem) => {
    if (activeTrackingTaskId === task.id) {
      setIsTimerRunning(false);
      setActiveTrackingTaskId(null);
    }
    onUpdateTasks(tasks.filter((t) => t.id !== task.id));
    logHistory(task, 'deleted', `Removed task from active list`, task.trackedSeconds);
  };

  const handleExportHistoryCsv = () => {
    const headers = [
      'Timestamp',
      'Task Title',
      'Category',
      'Priority',
      'Action',
      'Tracked Duration',
      'Details',
    ];
    const rows = history.map((h) => [
      new Date(h.timestamp).toLocaleString(),
      `"${h.taskTitle.replace(/"/g, '""')}"`,
      h.category,
      h.priority.toUpperCase(),
      h.action,
      h.durationSeconds ? formatTrackedDuration(h.durationSeconds) : '00m 00s',
      `"${h.details.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScanWake-Task-History-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredHistory = history.filter((h) =>
    historyFilter === 'all' ? true : h.action === historyFilter
  );

  return (
    <div className="space-y-5">
      {/* Top KPI & Progress Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-3.5 rounded-2xl border border-gray-800"
        >
          <div className="text-xs text-gray-400">Completion Rate</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white tabular-nums">
              {analytics.completionRatePercent}%
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--sw-accent)' }}>
              {analytics.completedTasks}/{analytics.totalTasks} done
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              style={{
                width: `${analytics.completionRatePercent}%`,
                backgroundColor: 'var(--sw-primary)',
              }}
              className="h-full transition-all"
            />
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-3.5 rounded-2xl border border-gray-800"
        >
          <div className="text-xs text-gray-400">Total Focus Tracked</div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-white font-mono tabular-nums">
            {formatTrackedDuration(analytics.totalTrackedSeconds)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            {analytics.inProgressTasks} active · {analytics.pendingTasks} pending
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-3.5 rounded-2xl border border-gray-800"
        >
          <div className="text-xs text-gray-400">High Priority Open</div>
          <div className="mt-1 text-2xl font-black text-white tabular-nums">
            {analytics.highPriorityPending}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">
            Scheduled with 12h AM/PM targets
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-3.5 rounded-2xl border border-gray-800"
        >
          <div className="text-xs text-gray-400">History Log Events</div>
          <div className="mt-1 text-2xl font-black text-white tabular-nums">
            {history.length}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'var(--sw-accent)' }}>
            Full audit &amp; time log
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar: Manage Tasks | Live Tracker | Task History */}
      <div className="flex items-center justify-between">
        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 rounded-xl border border-gray-800 gap-1"
        >
          <button
            type="button"
            onClick={() => setSubView('tasks')}
            style={
              subView === 'tasks'
                ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                : undefined
            }
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              subView === 'tasks' ? 'shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 shrink-0" />
            <span>Tasks ({tasks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('tracker')}
            style={
              subView === 'tracker'
                ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                : undefined
            }
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              subView === 'tracker' ? 'shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <span>Live Tracker {isTimerRunning ? '• ON' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('history')}
            style={
              subView === 'history'
                ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                : undefined
            }
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 whitespace-nowrap ${
              subView === 'history' ? 'shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* SUBVIEW 1: MANAGE TASKS */}
      {subView === 'tasks' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div
            style={{ backgroundColor: 'var(--sw-surface)' }}
            className="p-3.5 rounded-2xl border border-gray-800 flex flex-col md:flex-row gap-2.5"
          >
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, notes, or checklist items..."
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="w-full border border-gray-800 focus:border-[var(--sw-primary)] rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'pending', 'in_progress', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  style={
                    statusFilter === st
                      ? { backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }
                      : { backgroundColor: 'var(--sw-bg)' }
                  }
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === st
                      ? ''
                      : 'text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {st === 'all'
                    ? 'All'
                    : st === 'in_progress'
                    ? 'In Progress'
                    : st === 'pending'
                    ? 'Pending'
                    : 'Completed'}
                </button>
              ))}
            </div>

            {/* Category & Priority Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 outline-none"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Task Cards List */}
          {filteredTasks.length === 0 ? (
            <div
              style={{ backgroundColor: 'var(--sw-surface)' }}
              className="p-10 text-center rounded-2xl border border-gray-800"
            >
              <ListChecks className="w-10 h-10 text-gray-500 mx-auto mb-2.5" />
              <h3 className="text-base font-bold text-white">No Tasks Match Filter</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Create a new task with subtasks, live time tracking, and 12-hour AM/PM scheduling.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                className="mt-4 py-2 px-4 rounded-xl text-xs font-bold"
              >
                Create First Task
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const subProg = calculateSubtaskProgress(task.subtasks);
                const linkedTag = registeredTags.find((t) => t.id === task.linkedTagId);
                const isThisTracking =
                  activeTrackingTaskId === task.id && isTimerRunning;

                return (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: 'var(--sw-surface)',
                      borderColor: isThisTracking
                        ? 'var(--sw-primary)'
                        : task.status === 'completed'
                        ? '#1f2937'
                        : 'color-mix(in srgb, var(--sw-primary) 25%, transparent)',
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border transition ${
                      task.status === 'completed' ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                      {/* Left: Checkbox + Title + Unboxed Metadata + Subtasks */}
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <button
                          type="button"
                          aria-label={`Mark "${task.title}" as ${
                            task.status === 'completed' ? 'incomplete' : 'completed'
                          }`}
                          onClick={() => handleToggleComplete(task)}
                          style={
                            task.status === 'completed'
                              ? {
                                  backgroundColor: 'var(--sw-primary)',
                                  borderColor: 'var(--sw-primary)',
                                  color: 'var(--sw-bg)',
                                }
                              : { backgroundColor: 'var(--sw-bg)' }
                          }
                          className="w-6 h-6 rounded-lg border border-gray-600 flex items-center justify-center shrink-0 mt-0.5 transition"
                        >
                          {task.status === 'completed' && (
                            <Check className="w-4 h-4 stroke-[3]" />
                          )}
                        </button>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4
                              className={`text-sm sm:text-base font-bold ${
                                task.status === 'completed'
                                  ? 'line-through text-gray-400'
                                  : 'text-white'
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>

                          {/* Clean Unboxed Metadata Line */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 tabular-nums">
                            <span
                              className={
                                task.priority === 'high'
                                  ? 'text-red-400 font-semibold'
                                  : task.priority === 'medium'
                                  ? 'text-amber-300 font-semibold'
                                  : 'text-gray-300'
                              }
                            >
                              {task.priority === 'high'
                                ? 'High Priority'
                                : task.priority === 'medium'
                                ? 'Medium Priority'
                                : 'Low Priority'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{task.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono" style={{ color: 'var(--sw-accent)' }}>
                              Due {task.dueTime12h}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              Tracked: {formatTrackedDuration(task.trackedSeconds)} /{' '}
                              {task.estimatedMinutes}m est
                            </span>
                            {task.isRecurringDaily && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Daily Routine</span>
                              </>
                            )}
                            {linkedTag && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span
                                  className="inline-flex items-center space-x-1"
                                  style={{ color: 'var(--sw-primary)' }}
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>Tag: {linkedTag.name}</span>
                                </span>
                              </>
                            )}
                          </div>

                          {task.notes && (
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {task.notes}
                            </p>
                          )}

                          {/* Interactive Subtask Checklist */}
                          {task.subtasks.length > 0 && (
                            <div className="pt-2 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                                <span>
                                  Checklist ({subProg.completedCount}/{subProg.totalCount})
                                </span>
                                <span>{subProg.percent}%</span>
                              </div>
                              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  style={{
                                    width: `${subProg.percent}%`,
                                    backgroundColor: 'var(--sw-secondary)',
                                  }}
                                  className="h-full transition-all"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                {task.subtasks.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => handleToggleSubtask(task, sub.id)}
                                    style={{ backgroundColor: 'var(--sw-bg)' }}
                                    className="p-2 rounded-lg border border-gray-800 hover:border-gray-700 text-left text-xs flex items-center space-x-2 transition"
                                  >
                                    <div
                                      style={
                                        sub.completed
                                          ? {
                                              backgroundColor: 'var(--sw-secondary)',
                                              borderColor: 'var(--sw-secondary)',
                                              color: 'var(--sw-bg)',
                                            }
                                          : undefined
                                      }
                                      className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center shrink-0"
                                    >
                                      {sub.completed && <Check className="w-3 h-3 stroke-[3]" />}
                                    </div>
                                    <span
                                      className={`truncate ${
                                        sub.completed
                                          ? 'line-through text-gray-500'
                                          : 'text-gray-200'
                                      }`}
                                    >
                                      {sub.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Track Timer, Edit, Duplicate, Delete Controls */}
                      <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800/60 shrink-0">
                        {task.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleStartLiveTracking(task)}
                            style={
                              isThisTracking
                                ? {
                                    backgroundColor: '#EF4444',
                                    color: '#FFFFFF',
                                  }
                                : {
                                    backgroundColor: 'var(--sw-primary)',
                                    color: 'var(--sw-bg)',
                                  }
                            }
                            className="py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap"
                          >
                            {isThisTracking ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Track</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="p-2 rounded-lg border border-gray-800 hover:border-gray-600 text-gray-300 hover:text-white transition"
                          title="Edit Task"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateTask(task)}
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="p-2 rounded-lg border border-gray-800 hover:border-gray-600 text-gray-300 hover:text-white transition"
                          title="Duplicate Task"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          aria-label={`Delete task ${task.title}`}
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="p-2 rounded-lg border border-gray-800 hover:border-red-500/50 text-gray-400 hover:text-red-400 transition"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: LIVE FOCUS & TASK TRACKER */}
      {subView === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Columns: Active Stopwatch & Task Execution */}
          <div
            style={{ backgroundColor: 'var(--sw-surface)' }}
            className="lg:col-span-2 p-5 sm:p-6 rounded-2xl border border-gray-800 flex flex-col justify-between space-y-5"
          >
            {activeTrackedTask ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Active Focus Task</span>
                    <span className="font-mono" style={{ color: 'var(--sw-accent)' }}>
                      Due {activeTrackedTask.dueTime12h} · {activeTrackedTask.category}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">
                    {activeTrackedTask.title}
                  </h3>
                  {activeTrackedTask.notes && (
                    <p className="text-xs text-gray-300">{activeTrackedTask.notes}</p>
                  )}
                </div>

                {/* Big Tabular Digital Stopwatch Display */}
                <div
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="p-6 rounded-2xl border border-gray-800 text-center space-y-2"
                >
                  <div className="text-xs text-gray-400">
                    Cumulative Time Tracked on Task
                  </div>
                  <div
                    style={{ color: 'var(--sw-primary)' }}
                    className="text-4xl sm:text-6xl font-black font-mono tabular-nums tracking-tight"
                  >
                    {formatTrackedDuration(activeTrackedTask.trackedSeconds)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono tabular-nums">
                    Current Session: {formatTrackedDuration(sessionSeconds)} · Target:{' '}
                    {activeTrackedTask.estimatedMinutes}m
                  </div>
                </div>

                {/* Primary Timer Action Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isTimerRunning) {
                        setIsTimerRunning(false);
                        logHistory(
                          activeTrackedTask,
                          'paused_tracking',
                          `Paused timer after ${formatTrackedDuration(sessionSeconds)}`,
                          sessionSeconds
                        );
                      } else {
                        setIsTimerRunning(true);
                        logHistory(
                          activeTrackedTask,
                          'started_tracking',
                          'Resumed live focus tracking'
                        );
                      }
                    }}
                    style={{
                      backgroundColor: isTimerRunning ? '#EF4444' : 'var(--sw-primary)',
                      color: isTimerRunning ? '#FFFFFF' : 'var(--sw-bg)',
                    }}
                    className="py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2"
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Timer</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start / Resume Timer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleComplete(activeTrackedTask)}
                    style={{
                      backgroundColor: 'var(--sw-secondary)',
                      color: 'var(--sw-bg)',
                    }}
                    className="py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {activeTrackedTask.status === 'completed'
                        ? 'Reopen Task'
                        : 'Complete Task'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setSessionSeconds(0);
                    }}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="py-3 px-4 rounded-xl border border-gray-700 hover:border-gray-500 text-xs font-bold text-gray-200 transition flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Session</span>
                  </button>
                </div>

                {/* Subtasks inside Live Tracker */}
                {activeTrackedTask.subtasks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <div className="text-xs font-bold text-gray-200">
                      Action Checklist ({activeTrackedTask.subtasks.filter((s) => s.completed).length}/
                      {activeTrackedTask.subtasks.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeTrackedTask.subtasks.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleToggleSubtask(activeTrackedTask, sub.id)}
                          style={{ backgroundColor: 'var(--sw-bg)' }}
                          className="p-2.5 rounded-xl border border-gray-800 text-left text-xs flex items-center space-x-2.5"
                        >
                          <div
                            style={
                              sub.completed
                                ? {
                                    backgroundColor: 'var(--sw-primary)',
                                    borderColor: 'var(--sw-primary)',
                                    color: 'var(--sw-bg)',
                                  }
                                : undefined
                            }
                            className="w-4 h-4 rounded border border-gray-600 flex items-center justify-center shrink-0"
                          >
                            {sub.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span
                            className={
                              sub.completed ? 'line-through text-gray-500' : 'text-white'
                            }
                          >
                            {sub.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400">
                  No tasks available to track. Create a task to begin tracking time.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Switch Task to Track */}
          <div
            style={{ backgroundColor: 'var(--sw-surface)' }}
            className="p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-3"
          >
            <h4 className="text-sm font-bold text-white">Select Task to Track</h4>
            <div className="space-y-2 max-h-[380px] overflow-y-auto no-scrollbar">
              {tasks.map((t) => {
                const isSelected = activeTrackedTask?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setSessionSeconds(0);
                      setActiveTrackingTaskId(t.id);
                    }}
                    style={{
                      backgroundColor: 'var(--sw-bg)',
                      borderColor: isSelected ? 'var(--sw-primary)' : '#1f2937',
                    }}
                    className="w-full p-3 rounded-xl border text-left transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{t.title}</div>
                      <div className="text-[11px] text-gray-400 font-mono tabular-nums mt-0.5">
                        {formatTrackedDuration(t.trackedSeconds)} · {t.dueTime12h}
                      </div>
                    </div>
                    <span
                      style={{
                        color:
                          t.status === 'completed'
                            ? '#10B981'
                            : isSelected
                            ? 'var(--sw-primary)'
                            : '#9CA3AF',
                      }}
                      className="text-[11px] font-bold shrink-0"
                    >
                      {t.status === 'completed'
                        ? 'Done'
                        : isSelected
                        ? 'Selected'
                        : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: TASK HISTORY & AUDIT LOG */}
      {subView === 'history' && (
        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-4 sm:p-5 rounded-2xl border border-gray-800 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3.5">
            <div>
              <h3 className="text-base font-bold text-white">
                Task Execution &amp; Tracking History
              </h3>
              <p className="text-xs text-gray-400">
                Complete chronological log of created, tracked, completed, and reopened tasks
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter history by action"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 outline-none"
              >
                <option value="all">All Events ({history.length})</option>
                <option value="completed">Completed</option>
                <option value="started_tracking">Started Tracking</option>
                <option value="paused_tracking">Paused Tracking</option>
                <option value="created">Created</option>
                <option value="reopened">Reopened</option>
              </select>

              <button
                type="button"
                onClick={handleExportHistoryCsv}
                disabled={history.length === 0}
                style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                className="py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateHistory([])}
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="py-1.5 px-3 rounded-xl border border-gray-700 hover:border-red-500/50 text-xs font-semibold text-gray-300 hover:text-red-400 transition"
                >
                  Clear Log
                </button>
              )}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-400">
              No task history entries recorded for this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-800/80 max-h-[420px] overflow-y-auto no-scrollbar">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-bold text-white">{item.taskTitle}</span>
                      <span aria-hidden="true" className="text-gray-600">
                        ·
                      </span>
                      <span
                        style={{
                          color:
                            item.action === 'completed'
                              ? '#10B981'
                              : item.action === 'started_tracking'
                              ? 'var(--sw-primary)'
                              : 'var(--sw-accent)',
                        }}
                        className="font-semibold capitalize"
                      >
                        {item.action.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true" className="text-gray-600">
                        ·
                      </span>
                      <span className="text-gray-400">{item.category}</span>
                    </div>
                    <div className="text-gray-400">{item.details}</div>
                  </div>

                  <div className="text-[11px] font-mono text-gray-400 tabular-nums shrink-0">
                    {new Date(item.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}{' '}
                    · {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {showTaskModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
        >
          <div
            style={{ backgroundColor: 'var(--sw-surface)', borderColor: 'var(--sw-primary)' }}
            className="border rounded-2xl max-w-lg w-full p-4 sm:p-6 text-white shadow-2xl relative my-4"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
              <div>
                <h2 id="task-modal-title" className="text-base sm:text-lg font-bold text-white">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p className="text-xs text-gray-400">
                  Configure schedule, checklist subtasks, and tracking goal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                aria-label="Close Task Modal"
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 py-4 max-h-[70vh] overflow-y-auto no-scrollbar pr-0.5">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning Workout & Hydration"
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-3 text-xs sm:text-sm text-white outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Description / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional details or steps..."
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-xl py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="w-full border border-gray-700 rounded-xl py-2 px-2.5 text-xs text-white outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="w-full border border-gray-700 rounded-xl py-2 px-2.5 text-xs text-white outline-none"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              {/* 12-Hour Due Time (AM/PM) + Estimated Focus Minutes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Scheduled Time (12-Hour)
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={hour12}
                      onChange={(e) =>
                        setHour12(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))
                      }
                      style={{ backgroundColor: 'var(--sw-bg)' }}
                      className="w-14 text-center border border-gray-700 rounded-xl py-2 text-xs font-bold text-white"
                    />
                    <span className="font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minute.toString().padStart(2, '0')}
                      onChange={(e) =>
                        setMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))
                      }
                      style={{ backgroundColor: 'var(--sw-bg)' }}
                      className="w-14 text-center border border-gray-700 rounded-xl py-2 text-xs font-bold text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setPeriod(period === 'AM' ? 'PM' : 'AM')}
                      style={{
                        backgroundColor: 'var(--sw-primary)',
                        color: 'var(--sw-bg)',
                      }}
                      className="py-2 px-3 rounded-xl text-xs font-black"
                    >
                      {period}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Estimated Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="240"
                    value={estimatedMinutes}
                    onChange={(e) =>
                      setEstimatedMinutes(Math.max(1, parseInt(e.target.value) || 25))
                    }
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="w-full border border-gray-700 rounded-xl py-2 px-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Optional Physical QR Tag Link */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Link Physical QR Tag (Optional)
                </label>
                <select
                  value={linkedTagId}
                  onChange={(e) => setLinkedTagId(e.target.value)}
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="w-full border border-gray-700 rounded-xl py-2 px-3 text-xs text-white outline-none"
                >
                  <option value="">No QR Tag Required</option>
                  {registeredTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name} ({tag.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtasks Builder */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Checklist Subtasks ({subtasks.length})
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskInModal();
                      }
                    }}
                    placeholder="Add a checklist step..."
                    style={{ backgroundColor: 'var(--sw-bg)' }}
                    className="flex-1 border border-gray-700 rounded-xl py-1.5 px-3 text-xs text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskInModal}
                    style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
                    className="py-1.5 px-3 rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto no-scrollbar">
                    {subtasks.map((s) => (
                      <div
                        key={s.id}
                        style={{ backgroundColor: 'var(--sw-bg)' }}
                        className="py-1.5 px-3 rounded-lg border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <span className="truncate">{s.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSubtasks(subtasks.filter((item) => item.id !== s.id))
                          }
                          className="text-gray-500 hover:text-red-400 ml-2"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskModal}
                disabled={!title.trim()}
                style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
