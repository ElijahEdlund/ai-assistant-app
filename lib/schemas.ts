import { z } from 'zod';

// User Preferences Schema
export const UserPrefsSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  username: z.string().nullable().optional(),
  biometric_enabled: z.boolean().default(false),
  timezone: z.string().default('America/New_York'),
  push_token: z.string().nullable().optional(),
  preferred_windows: z.array(z.string()).optional(), // e.g., ['09:00-12:00', '14:00-17:00']
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type UserPrefs = z.infer<typeof UserPrefsSchema>;

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  timeframe_weeks: z.number().int().positive().optional(),
  daily_minutes: z.number().int().positive().optional(),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Goal = z.infer<typeof GoalSchema>;

// Milestone Schema
export const MilestoneSchema = z.object({
  id: z.string().uuid().optional(),
  goal_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  day_index: z.number().int().nonnegative(), // Day 0 = start date
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Milestone = z.infer<typeof MilestoneSchema>;

// Task Schema
export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  milestone_id: z.string().uuid(),
  goal_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  day_index: z.number().int().nonnegative(),
  due_at: z.string().datetime(), // UTC timestamp
  duration_min: z.number().int().positive().default(45),
  status: z.enum(['todo', 'doing', 'done', 'snoozed']).default('todo'),
  note: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// Checkin Schema
export const CheckinSchema = z.object({
  id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  goal_id: z.string().uuid(),
  user_id: z.string().uuid(),
  completed_at: z.string().datetime(), // UTC timestamp
  on_time: z.boolean(), // Completed within ±15min of scheduled time
  note: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type Checkin = z.infer<typeof CheckinSchema>;

// Qualifying Questions Response Schema
export const QualifyingQuestionsSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  timeframe_weeks: z.number().int().positive(),
  daily_minutes: z.number().int().positive(),
  preferred_windows: z.array(z.string()), // e.g., ['09:00-12:00', '14:00-17:00']
  constraints: z.string().optional(),
});

export type QualifyingQuestions = z.infer<typeof QualifyingQuestionsSchema>;

