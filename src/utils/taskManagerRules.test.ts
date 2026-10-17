import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubtaskProgress,
  formatTrackedDuration,
  computeTaskAnalytics,
  filterAndSortTasks,
  createHistoryEntry,
} from './taskManagerRules.ts';
import type { TaskItem } from './taskManagerRules.ts';

const SAMPLE_TASKS: TaskItem[] = [
  {
    id: 't1',
    title: 'Morning Hydration & Stretch',
    notes: 'Drink 500ml water after scanning bathroom QR',
    category: 'Morning Routine',
    priority: 'high',
    status: 'completed',
    dueTime12h: '06:40 AM',
    dueDate: '2026-10-17',
    estimatedMinutes: 15,
    trackedSeconds: 900,
    isRecurringDaily: true,
    subtasks: [
      { id: 's1', title: 'Drink 500ml water', completed: true },
      { id: 's2', title: '10 min mobility stretch', completed: true },
    ],
    createdAt: 1000,
    completedAt: 2000,
  },
  {
    id: 't2',
    title: 'Deep Focus Coding Session',
    notes: 'Complete architecture module',
    category: 'Work & Study',
    priority: 'high',
    status: 'in_progress',
    dueTime12h: '09:00 AM',
    dueDate: '2026-10-17',
    estimatedMinutes: 60,
    trackedSeconds: 1850,
    isRecurringDaily: false,
    subtasks: [
      { id: 's3', title: 'Write unit tests', completed: true },
      { id: 's4', title: 'Verify UI layout', completed: false },
    ],
    createdAt: 3000,
  },
  {
    id: 't3',
    title: 'Evening Cardio Run',
    notes: '5km outdoor run',
    category: 'Health & Fitness',
    priority: 'medium',
    status: 'pending',
    dueTime12h: '06:00 PM',
    dueDate: '2026-10-17',
    estimatedMinutes: 30,
    trackedSeconds: 0,
    isRecurringDaily: false,
    subtasks: [],
    createdAt: 4000,
  },
];

test('calculateSubtaskProgress computes accurate completion ratio', () => {
  const empty = calculateSubtaskProgress([]);
  assert.equal(empty.percent, 0);
  assert.equal(empty.totalCount, 0);

  const half = calculateSubtaskProgress(SAMPLE_TASKS[1].subtasks);
  assert.equal(half.completedCount, 1);
  assert.equal(half.totalCount, 2);
  assert.equal(half.percent, 50);
});

test('formatTrackedDuration formats seconds into readable minutes and hours', () => {
  assert.equal(formatTrackedDuration(0), '00m 00s');
  assert.equal(formatTrackedDuration(125), '02m 05s');
  assert.equal(formatTrackedDuration(3665), '1h 01m 05s');
});

test('computeTaskAnalytics calculates totals, completion rate, and tracked time', () => {
  const summary = computeTaskAnalytics(SAMPLE_TASKS);
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.completedTasks, 1);
  assert.equal(summary.inProgressTasks, 1);
  assert.equal(summary.pendingTasks, 1);
  assert.equal(summary.completionRatePercent, 33);
  assert.equal(summary.totalTrackedSeconds, 2750);
  assert.equal(summary.highPriorityPending, 1);
});

test('filterAndSortTasks prioritizes in_progress over pending and completed last', () => {
  const sorted = filterAndSortTasks(SAMPLE_TASKS, { status: 'all' });
  assert.equal(sorted[0].id, 't2'); // in_progress first
  assert.equal(sorted[1].id, 't3'); // pending second
  assert.equal(sorted[2].id, 't1'); // completed last

  const searchFiltered = filterAndSortTasks(SAMPLE_TASKS, { searchQuery: 'cardio' });
  assert.equal(searchFiltered.length, 1);
  assert.equal(searchFiltered[0].id, 't3');
});

test('createHistoryEntry records task lifecycle event with metadata', () => {
  const entry = createHistoryEntry(
    SAMPLE_TASKS[1],
    'completed',
    'Completed Deep Focus Coding Session',
    1850,
    50000
  );
  assert.equal(entry.taskId, 't2');
  assert.equal(entry.action, 'completed');
  assert.equal(entry.durationSeconds, 1850);
  assert.equal(entry.timestamp, 50000);
});
