import { create } from 'zustand';
import { getPlan, setPlan, WorkoutPlan, Assessment } from '../data/dataClient';
import { getJSON, setJSON } from '../storage';

const WORKOUT_LOGS_KEY = 'workout_logs';

export interface WorkoutLogEntry {
  id: string;
  completed: boolean;
  note?: string;
  completedAt?: string;
}

interface ProgramState {
  plan: WorkoutPlan | null;
  loading: boolean;
  workoutLogs: Record<string, WorkoutLogEntry>;
  load: () => Promise<void>;
  save: (plan: WorkoutPlan) => Promise<void>;
  toggleWorkoutCompletion: (workoutId: string) => Promise<void>;
  updateWorkoutNote: (workoutId: string, note: string) => Promise<void>;
  hydrateLogs: () => Promise<void>;
  generateMockPlan: (assessment: Assessment) => WorkoutPlan;
}

export function generateMockPlan(assessment: Assessment): WorkoutPlan {
  const weeks = 12;
  const weeklyDays = assessment.weekly_days || 3;
  const workouts: any[] = [];
  
  const workoutNames = [
    'Upper Body Strength',
    'Lower Body Power',
    'Full Body Conditioning',
    'Core & Stability',
    'Cardio & Endurance',
    'Flexibility & Recovery',
  ];

  let dayOffset = 0;
  for (let week = 1; week <= weeks; week++) {
    const weekWorkouts: any[] = [];
    for (let day = 0; day < weeklyDays; day++) {
      const workoutIndex = day % workoutNames.length;
      const workoutDay = dayOffset + day;
      
      weekWorkouts.push({
        id: `wk${week}-d${workoutDay + 1}`,
        week,
        day: workoutDay + 1,
        name: workoutNames[workoutIndex],
        exercises: [
          { name: 'Exercise 1', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 2', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 3', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 4', sets: 3, reps: 10, rest: '60s' },
        ],
        scheduledDate: new Date(Date.now() + workoutDay * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
    workouts.push(...weekWorkouts);
    dayOffset += 7;
  }

  return {
    user_id: assessment.user_id,
    plan: {
      weeks,
      startDate: new Date().toISOString().split('T')[0],
      workouts,
      goals: assessment.goals,
      weeklyDays: assessment.weekly_days,
    },
  } as WorkoutPlan;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  plan: null,
  loading: false,
  workoutLogs: {},
  load: async () => {
    set({ loading: true });
    try {
      const [plan, logs] = await Promise.all([
        getPlan(),
        getJSON<Record<string, WorkoutLogEntry>>(WORKOUT_LOGS_KEY),
      ]);
      set({ plan, workoutLogs: logs || {} });
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      set({ loading: false });
    }
  },
  save: async (plan: WorkoutPlan) => {
    try {
      await setPlan(plan);
      set({ plan });
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  },
  hydrateLogs: async () => {
    try {
      const logs = await getJSON<Record<string, WorkoutLogEntry>>(WORKOUT_LOGS_KEY);
      if (logs) {
        set({ workoutLogs: logs });
      }
    } catch (error) {
      console.error('Error loading workout logs:', error);
    }
  },
  toggleWorkoutCompletion: async (workoutId: string) => {
    const { workoutLogs } = get();
    const existing = workoutLogs[workoutId];
    const nextCompleted = !(existing?.completed ?? false);
    const updated: WorkoutLogEntry = {
      id: workoutId,
      completed: nextCompleted,
      note: existing?.note,
      completedAt: nextCompleted ? new Date().toISOString() : undefined,
    };
    const logs = {
      ...workoutLogs,
      [workoutId]: updated,
    };
    if (!nextCompleted && logs[workoutId]) {
      delete logs[workoutId].completedAt;
    }
    set({ workoutLogs: logs });
    await setJSON(WORKOUT_LOGS_KEY, logs);
  },
  updateWorkoutNote: async (workoutId: string, note: string) => {
    const { workoutLogs } = get();
    const existing = workoutLogs[workoutId];
    const updated: WorkoutLogEntry = {
      id: workoutId,
      completed: existing?.completed ?? false,
      note,
      completedAt: existing?.completedAt,
    };
    const logs = {
      ...workoutLogs,
      [workoutId]: updated,
    };
    set({ workoutLogs: logs });
    await setJSON(WORKOUT_LOGS_KEY, logs);
  },
  generateMockPlan,
}));

