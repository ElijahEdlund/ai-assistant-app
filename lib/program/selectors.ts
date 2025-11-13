import dayjs, { Dayjs } from 'dayjs';
import { WorkoutPlan } from '../data/dataClient';
import { WorkoutLogEntry } from '../state/program';

export interface NormalizedWorkout {
  id: string;
  name: string;
  scheduledDate?: string;
  exercises: Array<{ name: string; sets?: number; reps?: number; rest?: string; notes?: string }>;
  tag: string;
  preview?: string;
  week?: number;
  day?: number;
}

export interface WeekDaySummary {
  date: string;
  label: string;
  dayOfMonth: string;
  isToday: boolean;
  workouts: NormalizedWorkout[];
}

const DEFAULT_TAG = 'Workout';

const isoWeekStart = (reference: Dayjs) => {
  const day = reference.day(); // Sunday = 0
  const diff = (day + 6) % 7; // convert to Monday start
  return reference.subtract(diff, 'day');
};

export function normaliseWorkouts(plan: WorkoutPlan | null): NormalizedWorkout[] {
  const workouts = plan?.plan?.workouts ?? [];
  return workouts.map((workout: any, index: number) => {
    const id =
      workout.id ||
      workout.uuid ||
      workout.scheduledDate ||
      `wk${workout.week ?? 0}-d${workout.day ?? 0}-${index}`;
    const firstExercise = workout.exercises?.[0];
    const tag = workout.name?.split(' ')[0] || DEFAULT_TAG;
    return {
      id,
      name: workout.name || DEFAULT_TAG,
      scheduledDate: workout.scheduledDate,
      exercises: workout.exercises || [],
      tag,
      preview: firstExercise?.name,
      week: workout.week,
      day: workout.day,
    };
  });
}

export function groupWorkoutsByDate(plan: WorkoutPlan | null) {
  const normalised = normaliseWorkouts(plan);
  return normalised.reduce<Record<string, NormalizedWorkout[]>>((acc, workout) => {
    const date = workout.scheduledDate;
    if (!date) {
      return acc;
    }
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(workout);
    return acc;
  }, {});
}

export function buildWeekDays(plan: WorkoutPlan | null, weekOffset = 0, referenceDate = dayjs()): WeekDaySummary[] {
  const workoutsByDate = groupWorkoutsByDate(plan);
  const start = isoWeekStart(referenceDate.add(weekOffset, 'week'));

  return Array.from({ length: 7 }).map((_, index) => {
    const day = start.add(index, 'day');
    const date = day.format('YYYY-MM-DD');
    return {
      date,
      label: day.format('ddd'),
      dayOfMonth: day.format('DD'),
      isToday: day.isSame(dayjs(), 'day'),
      workouts: workoutsByDate[date] || [],
    };
  });
}

export function getWorkoutById(plan: WorkoutPlan | null, workoutId: string | undefined) {
  if (!workoutId) return undefined;
  return normaliseWorkouts(plan).find((workout) => workout.id === workoutId);
}

export function getWorkoutForDate(plan: WorkoutPlan | null, date: string) {
  if (!date) return undefined;
  const byDate = groupWorkoutsByDate(plan);
  return byDate[date]?.[0];
}

export function countCompletedWorkouts(logs: Record<string, WorkoutLogEntry>) {
  return Object.values(logs).filter((log) => log.completed).length;
}

export function getCompletedWorkouts(logs: Record<string, WorkoutLogEntry>) {
  return Object.values(logs).filter((log) => log.completed);
}

