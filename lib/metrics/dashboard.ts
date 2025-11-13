import dayjs from 'dayjs';
import { WorkoutPlan, Assessment, Reflection } from '../data/dataClient';
import { WorkoutLogEntry } from '../state/program';
import { normaliseWorkouts } from '../program/selectors';

export interface VolumePoint {
  label: string;
  value: number;
}

export interface WeightTrendPoint {
  label: string;
  value: number;
}

export interface DashboardMetrics {
  phase: {
    currentWeek: number;
    totalWeeks: number;
    completionPercent: number;
    nextReassessmentDays: number;
  };
  performance: {
    completedWorkouts: number;
    totalScheduled: number;
    weeklyVolume: VolumePoint[];
    prsCount: number;
    cardioMinutes: number;
  };
  consistency: {
    completionRate: number;
    streakDays: number;
    averageWeekly: number;
    checkInRate: number;
  };
  wellbeing: {
    averageEnergy: number | null;
    averageSoreness: number | null;
    weightTrend: WeightTrendPoint[];
  };
  goals: {
    primary?: string;
    secondary?: string;
  };
}

const daysBetween = 7 * 4;

const calculateVolume = (workout: any) =>
  (workout?.exercises || []).reduce((total: number, exercise: any) => {
    if (exercise.sets && exercise.reps) {
      return total + exercise.sets * exercise.reps;
    }
    return total + 10;
  }, 0);

const getCompletionPercent = (completed: number, total: number) =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

const computeWeightTrend = (assessment: Assessment | null | undefined, reflections: Reflection[]) => {
  const baseWeight = assessment?.weight_kg ?? null;
  const points: WeightTrendPoint[] = [];
  if (!baseWeight) {
    return points;
  }

  const recentReflections = reflections
    .slice()
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(-6);

  if (recentReflections.length === 0) {
    return Array.from({ length: 5 }).map((_, idx) => ({
      label: dayjs().subtract(4 - idx, 'day').format('MM/DD'),
      value: Number((baseWeight + idx * 0.1).toFixed(1)),
    }));
  }

  let current = baseWeight;
  for (let i = 0; i < recentReflections.length; i++) {
    const reflection = recentReflections[i];
    const adjustment = reflection.energy ? (reflection.energy - 5) * 0.1 : 0;
    current = Number((current + adjustment).toFixed(1));
    points.push({
      label: dayjs(reflection.date).format('MM/DD'),
      value: current,
    });
  }
  return points;
};

const computeStreak = (workouts: any[], logs: Record<string, WorkoutLogEntry>) => {
  const sorted = workouts
    .filter((workout) => workout.scheduledDate)
    .sort((a, b) => (a.scheduledDate > b.scheduledDate ? -1 : 1));

  let streak = 0;
  const today = dayjs().format('YYYY-MM-DD');

  for (const workout of sorted) {
    const id = workout.id;
    const scheduledDate = workout.scheduledDate;
    if (!id || !scheduledDate) {
      continue;
    }
    const log = logs[id];
    if (!log?.completed) {
      if (scheduledDate <= today) {
        break;
      }
      continue;
    }
    if (dayjs(today).diff(dayjs(scheduledDate), 'day') === streak) {
      streak += 1;
    } else if (dayjs(scheduledDate).isBefore(dayjs(today))) {
      break;
    }
  }

  return streak;
};

export function buildDashboardMetrics({
  plan,
  logs,
  reflections,
  assessment,
}: {
  plan: WorkoutPlan | null;
  logs: Record<string, WorkoutLogEntry>;
  reflections: Reflection[];
  assessment: Assessment | null;
}): DashboardMetrics {
  const workouts = normaliseWorkouts(plan);
  const completedWorkouts = Object.values(logs).filter((log) => log.completed);
  const totalScheduled = workouts.length;
  const completedCount = completedWorkouts.length;

  const startDate = plan?.plan?.startDate ? dayjs(plan.plan.startDate) : dayjs();
  const totalWeeks = plan?.plan?.weeks ?? 12;
  const currentWeek = Math.min(Math.max(dayjs().diff(startDate, 'week') + 1, 1), totalWeeks);
  const completionPercent = getCompletionPercent(completedCount, totalScheduled);
  const nextReassessment = startDate.add(4, 'week');
  const nextReassessmentDays = Math.max(nextReassessment.diff(dayjs(), 'day'), 0);

  const weeklyVolumeMap = new Map<string, number>();
  workouts.forEach((workout) => {
    if (!workout.scheduledDate) return;
    const weekKey = dayjs(workout.scheduledDate).format('YYYY-[W]WW');
    const volume = calculateVolume(workout);
    weeklyVolumeMap.set(weekKey, (weeklyVolumeMap.get(weekKey) || 0) + volume);
  });

  const weeklyVolume: VolumePoint[] = Array.from(weeklyVolumeMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .slice(-6)
    .map(([weekKey, value]) => ({
      label: weekKey.split('-')[1] ?? weekKey,
      value,
    }));

  const cardioMinutes = completedWorkouts.reduce((total, log) => {
    const workout = workouts.find((w) => w.id === log.id);
    if (!workout) return total;
    const cardioExercise = workout.exercises.find((exercise) =>
      exercise.name?.toLowerCase().includes('cardio')
    );
    if (cardioExercise && cardioExercise.rest) {
      const minutes = parseInt(cardioExercise.rest, 10);
      if (!Number.isNaN(minutes)) {
        return total + minutes;
      }
    }
    return total;
  }, 0);

  const reflectionsWindow = reflections.filter((reflection) =>
    dayjs(reflection.date).isAfter(dayjs().subtract(daysBetween, 'day'))
  );
  const energyValues = reflectionsWindow.map((reflection) => reflection.energy).filter(Boolean) as number[];
  const sorenessValues = reflectionsWindow.map((reflection) => reflection.soreness).filter(Boolean) as number[];

  const averageEnergy =
    energyValues.length > 0 ? Number((energyValues.reduce((a, b) => a + b, 0) / energyValues.length).toFixed(1)) : null;
  const averageSoreness =
    sorenessValues.length > 0
      ? Number((sorenessValues.reduce((a, b) => a + b, 0) / sorenessValues.length).toFixed(1))
      : null;

  const weightTrend = computeWeightTrend(assessment, reflectionsWindow);

  const streakDays = computeStreak(workouts, logs);

  const recentCompleted = completedWorkouts.filter((log) =>
    log.completedAt ? dayjs(log.completedAt).isAfter(dayjs().subtract(daysBetween, 'day')) : false
  );
  const averageWeekly =
    recentCompleted.length > 0 ? Number((recentCompleted.length / 4).toFixed(1)) : completedCount > 0 ? 1 : 0;

  const daysInWindow = Math.max(dayjs().diff(dayjs().subtract(daysBetween, 'day'), 'day'), 1);
  const checkInRate =
    daysInWindow > 0 ? Math.round(((reflectionsWindow.length || 0) / daysInWindow) * 100) : 0;

  const prsCount = completedWorkouts.filter((log) => log.note?.toLowerCase().includes('pr')).length;

  return {
    phase: {
      currentWeek,
      totalWeeks,
      completionPercent,
      nextReassessmentDays,
    },
    performance: {
      completedWorkouts: completedCount,
      totalScheduled,
      weeklyVolume,
      prsCount,
      cardioMinutes,
    },
    consistency: {
      completionRate: completionPercent,
      streakDays,
      averageWeekly,
      checkInRate,
    },
    wellbeing: {
      averageEnergy,
      averageSoreness,
      weightTrend,
    },
    goals: {
      primary: assessment?.goals?.[0],
      secondary: assessment?.goals?.[1],
    },
  };
}

