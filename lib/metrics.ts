import { Checkin, Task } from './schemas';
import { utcToLocal, getLocalDate } from './time';
import dayjs from 'dayjs';

export interface GoalMetrics {
  streakDays: number;
  onTimePercentage: number;
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
  currentCycleStart: string; // YYYY-MM-DD
  currentCycleEnd: string; // YYYY-MM-DD
}

export function calculateStreakDays(checkins: Checkin[]): number {
  if (checkins.length === 0) return 0;

  // Group checkins by local date
  const dates = new Set<string>();
  checkins.forEach((checkin) => {
    const localDate = utcToLocal(checkin.completed_at).format('YYYY-MM-DD');
    dates.add(localDate);
  });

  // Sort dates descending
  const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));

  // Calculate consecutive days from today backwards
  let streak = 0;
  const today = dayjs(getLocalDate());
  let expectedDate = today;

  for (const dateStr of sortedDates) {
    const checkinDate = dayjs(dateStr);
    if (checkinDate.isSame(expectedDate, 'day')) {
      streak++;
      expectedDate = expectedDate.subtract(1, 'day');
    } else if (checkinDate.isBefore(expectedDate, 'day')) {
      // Gap found, streak broken
      break;
    }
    // If checkin is in the future (shouldn't happen), skip it
  }

  return streak;
}

export function calculateOnTimePercentage(checkins: Checkin[]): number {
  if (checkins.length === 0) return 0;
  const onTimeCount = checkins.filter((c) => c.on_time).length;
  return (onTimeCount / checkins.length) * 100;
}

export function calculateCompletionRate(
  tasks: Task[],
  checkins: Checkin[],
  cycleStart: string,
  cycleEnd: string
): number {
  // Get tasks in current 7-day cycle
  const cycleTasks = tasks.filter((task) => {
    const taskDate = utcToLocal(task.due_at).format('YYYY-MM-DD');
    return taskDate >= cycleStart && taskDate <= cycleEnd;
  });

  if (cycleTasks.length === 0) return 0;

  const completedTaskIds = new Set(checkins.map((c) => c.task_id));
  const completedInCycle = cycleTasks.filter((task) =>
    completedTaskIds.has(task.id!)
  ).length;

  return (completedInCycle / cycleTasks.length) * 100;
}

export function getCurrentCycleDates(): { start: string; end: string } {
  const today = dayjs(getLocalDate());
  const cycleStart = today.startOf('week').format('YYYY-MM-DD');
  const cycleEnd = today.endOf('week').format('YYYY-MM-DD');
  return { start: cycleStart, end: cycleEnd };
}

export function calculateGoalMetrics(
  tasks: Task[],
  checkins: Checkin[]
): GoalMetrics {
  const cycle = getCurrentCycleDates();
  const cycleTasks = tasks.filter((task) => {
    const taskDate = utcToLocal(task.due_at).format('YYYY-MM-DD');
    return taskDate >= cycle.start && taskDate <= cycle.end;
  });

  const completedTaskIds = new Set(checkins.map((c) => c.task_id));
  const completedTasks = cycleTasks.filter((task) =>
    completedTaskIds.has(task.id!)
  ).length;

  return {
    streakDays: calculateStreakDays(checkins),
    onTimePercentage: calculateOnTimePercentage(checkins),
    completionRate: calculateCompletionRate(tasks, checkins, cycle.start, cycle.end),
    totalTasks: cycleTasks.length,
    completedTasks,
    currentCycleStart: cycle.start,
    currentCycleEnd: cycle.end,
  };
}

