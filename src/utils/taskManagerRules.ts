/**
 * Task Management, Live Tracking & Task History Logic for ScanWake
 * Pure deterministic functions decoupled from DOM/React for unit testing
 */

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskCategory =
  | 'Morning Routine'
  | 'Work & Study'
  | 'Health & Fitness'
  | 'Household'
  | 'Personal';

export interface SubTaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueTime12h: string; // e.g., "07:00 AM"
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes: number;
  trackedSeconds: number;
  isRecurringDaily: boolean;
  linkedTagId?: string;
  subtasks: SubTaskItem[];
  createdAt: number;
  completedAt?: number;
}

export type TaskHistoryAction =
  | 'created'
  | 'started_tracking'
  | 'paused_tracking'
  | 'completed'
  | 'reopened'
  | 'deleted';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  priority: TaskPriority;
  action: TaskHistoryAction;
  timestamp: number;
  durationSeconds?: number;
  details: string;
}

export interface TaskAnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRatePercent: number;
  totalTrackedSeconds: number;
  highPriorityPending: number;
}

export function calculateSubtaskProgress(subtasks: SubTaskItem[]): {
  completedCount: number;
  totalCount: number;
  percent: number;
} {
  const totalCount = subtasks.length;
  if (totalCount === 0) {
    return { completedCount: 0, totalCount: 0, percent: 0 };
  }
  const completedCount = subtasks.filter((s) => s.completed).length;
  const percent = Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}

export function formatTrackedDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds
      .toString()
      .padStart(2, '0')}s`;
  }
  return `${minutes.toString().padStart(2, '0')}m ${seconds
    .toString()
    .padStart(2, '0')}s`;
}

export function computeTaskAnalytics(tasks: TaskItem[]): TaskAnalyticsSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
  const completionRatePercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalTrackedSeconds = tasks.reduce(
    (acc, t) => acc + (t.trackedSeconds || 0),
    0
  );
  const highPriorityPending = tasks.filter(
    (t) => t.priority === 'high' && t.status !== 'completed'
  ).length;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    completionRatePercent,
    totalTrackedSeconds,
    highPriorityPending,
  };
}

export interface TaskFilterOptions {
  status?: 'all' | TaskStatus;
  category?: 'all' | TaskCategory;
  priority?: 'all' | TaskPriority;
  searchQuery?: string;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function filterAndSortTasks(
  tasks: TaskItem[],
  options: TaskFilterOptions
): TaskItem[] {
  const query = (options.searchQuery || '').trim().toLowerCase();

  return tasks
    .filter((task) => {
      if (options.status && options.status !== 'all' && task.status !== options.status) {
        return false;
      }
      if (
        options.category &&
        options.category !== 'all' &&
        task.category !== options.category
      ) {
        return false;
      }
      if (
        options.priority &&
        options.priority !== 'all' &&
        task.priority !== options.priority
      ) {
        return false;
      }
      if (query) {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes.toLowerCase().includes(query);
        const matchesCategory = task.category.toLowerCase().includes(query);
        const matchesSubtasks = task.subtasks.some((s) =>
          s.title.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesNotes && !matchesCategory && !matchesSubtasks) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Incomplete tasks come before completed tasks
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // In-progress tasks come before pending tasks
      if (a.status === 'in_progress' && b.status === 'pending') return -1;
      if (a.status === 'pending' && b.status === 'in_progress') return 1;
      // Higher priority comes first
      const prioDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (prioDiff !== 0) return prioDiff;
      return b.createdAt - a.createdAt;
    });
}

export function createHistoryEntry(
  task: TaskItem,
  action: TaskHistoryAction,
  details: string,
  durationSeconds?: number,
  nowMs: number = Date.now()
): TaskHistoryEntry {
  return {
    id: `hist_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
    taskId: task.id,
    taskTitle: task.title,
    category: task.category,
    priority: task.priority,
    action,
    timestamp: nowMs,
    durationSeconds,
    details,
  };
}
