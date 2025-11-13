import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  Goal,
  GoalSchema,
  Milestone,
  MilestoneSchema,
  Task,
  TaskSchema,
  Checkin,
  CheckinSchema,
  UserPrefs,
  UserPrefsSchema,
} from './schemas';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  '';

// Export hasSupabase flag for conditional logic
export const hasSupabase = !!(supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && !supabaseAnonKey.includes('placeholder'));

// Create client with placeholder values if env vars are missing
// This allows the app to start, but Supabase operations will fail gracefully
const finalUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

if (!hasSupabase) {
  console.warn(
    '⚠️ Missing Supabase environment variables. ' +
    'Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file or app.config.js'
  );
}

export const supabase = hasSupabase ? createClient(finalUrl, finalKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : (null as any);

// Export configuration check helpers
export const isSupabaseConfigured = () => hasSupabase;

export const getSupabaseUrl = () => finalUrl;

// Debug helper to check configuration
export const debugSupabaseConfig = () => {
  console.log('=== Supabase Configuration Debug ===');
  console.log('supabaseUrl (from Constants):', supabaseUrl || 'NOT SET');
  console.log('supabaseAnonKey (from Constants):', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'NOT SET');
  console.log('finalUrl:', finalUrl);
  console.log('finalKey:', finalKey ? `${finalKey.substring(0, 20)}...` : 'NOT SET');
  console.log('isConfigured:', isSupabaseConfigured());
  console.log('process.env.EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'NOT SET');
  console.log('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? `${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET');
  console.log('===================================');
};

export type AuthUser = {
  id: string;
  email?: string;
};

// Goals CRUD
export const goals = {
  async create(data: Omit<Goal, 'id' | 'created_at' | 'updated_at'>): Promise<Goal> {
    const validated = GoalSchema.omit({ id: true, created_at: true, updated_at: true }).parse(data);
    const { data: result, error } = await supabase
      .from('goals')
      .insert(validated)
      .select()
      .single();
    if (error) throw error;
    return GoalSchema.parse(result);
  },

  async getById(id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return GoalSchema.parse(data);
  },

  async getByUserId(userId: string): Promise<Goal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item: unknown) => GoalSchema.parse(item));
  },

  async update(id: string, updates: Partial<Goal>): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return GoalSchema.parse(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },
};

// Milestones CRUD
export const milestones = {
  async create(data: Omit<Milestone, 'id' | 'created_at' | 'updated_at'>): Promise<Milestone> {
    const validated = MilestoneSchema.omit({ id: true, created_at: true, updated_at: true }).parse(data);
    const { data: result, error } = await supabase
      .from('milestones')
      .insert(validated)
      .select()
      .single();
    if (error) throw error;
    return MilestoneSchema.parse(result);
  },

  async getByGoalId(goalId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('goal_id', goalId)
      .order('day_index', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((item: unknown) => MilestoneSchema.parse(item));
  },

  async update(id: string, updates: Partial<Milestone>): Promise<Milestone> {
    const { data, error } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return MilestoneSchema.parse(data);
  },
};

// Tasks CRUD
export const tasks = {
  async create(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const validated = TaskSchema.omit({ id: true, created_at: true, updated_at: true }).parse(data);
    const { data: result, error } = await supabase
      .from('tasks')
      .insert(validated)
      .select()
      .single();
    if (error) throw error;
    return TaskSchema.parse(result);
  },

  async createMany(data: Omit<Task, 'id' | 'created_at' | 'updated_at'>[]): Promise<Task[]> {
    const validated = data.map((item) =>
      TaskSchema.omit({ id: true, created_at: true, updated_at: true }).parse(item)
    );
    const { data: result, error } = await supabase
      .from('tasks')
      .insert(validated)
      .select();
    if (error) throw error;
    return (result ?? []).map((item: unknown) => TaskSchema.parse(item));
  },

  async getById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return TaskSchema.parse(data);
  },

  async getByGoalId(goalId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .order('due_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((item: unknown) => TaskSchema.parse(item));
  },

  async getTodayTasks(userId: string, date: string): Promise<Task[]> {
    // date is in YYYY-MM-DD format (local date)
    // Get tasks through goals relationship
    const { data: goalsData } = await supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (!goalsData || goalsData.length === 0) return [];
    
    const goalIds = goalsData.map((g: { id: string }) => g.id);
    const startOfDay = `${date}T00:00:00Z`;
    const endOfDay = `${date}T23:59:59Z`;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('goal_id', goalIds)
      .eq('status', 'todo')
      .gte('due_at', startOfDay)
      .lte('due_at', endOfDay)
      .order('due_at', { ascending: true })
      .limit(3);
    if (error) throw error;
    return (data ?? []).map((item: unknown) => TaskSchema.parse(item));
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return TaskSchema.parse(data);
  },

  async snooze(id: string, nextDay: string): Promise<Task> {
    // nextDay is YYYY-MM-DD format
    const newDueAt = `${nextDay}T${new Date().toISOString().split('T')[1]}`;
    return this.update(id, { due_at: newDueAt, status: 'todo' });
  },
};

// Checkins CRUD
export const checkins = {
  async create(data: Omit<Checkin, 'id' | 'created_at'>): Promise<Checkin> {
    const validated = CheckinSchema.omit({ id: true, created_at: true }).parse(data);
    const { data: result, error } = await supabase
      .from('checkins')
      .insert(validated)
      .select()
      .single();
    if (error) throw error;
    return CheckinSchema.parse(result);
  },

  async getByGoalId(goalId: string): Promise<Checkin[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('goal_id', goalId)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item: unknown) => CheckinSchema.parse(item));
  },

  async getByUserId(userId: string): Promise<Checkin[]> {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item: unknown) => CheckinSchema.parse(item));
  },
};

// User Preferences CRUD
export const userPrefs = {
  async getByUserId(userId: string): Promise<UserPrefs | null> {
    const { data, error } = await supabase
      .from('user_prefs')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return UserPrefsSchema.parse(data);
  },

  async update(userId: string, updates: Partial<UserPrefs>): Promise<UserPrefs> {
    const { data, error } = await supabase
      .from('user_prefs')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return UserPrefsSchema.parse(data);
  },
};

