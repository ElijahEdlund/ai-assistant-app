import { hasSupabase, supabase } from '../supabase';
import { getJSON, setJSON, remove } from '../storage';

// Types
export interface Profile {
  id: string;
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  username?: string;
  created_at?: string;
}

export interface Subscription {
  id?: string;
  user_id: string;
  plan: 'trial' | 'monthly' | 'quarterly' | 'semiannual';
  started_at: string;
  renews_at: string;
  status: 'active' | 'cancelled' | 'expired';
  created_at?: string;
}

export interface Assessment {
  id?: string;
  user_id: string;
  goals: string[];
  weekly_days: number;
  available_days?: string[];
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  name?: string;
  has_equipment?: boolean;
  daily_minutes?: number;
  goal_description?: string;
  created_at?: string;
}

export interface WorkoutPlan {
  id?: string;
  user_id: string;
  plan: any; // JSONB - plan structure (12-week or 90-day)
  program_start_date?: string; // YYYY-MM-DD for 90-day programs
  created_at?: string;
  updated_at?: string;
}

export interface CheckIn {
  id?: string;
  user_id: string;
  program_id?: string;
  day_number?: number; // 1-90
  date: string; // YYYY-MM-DD
  type: 'pre' | 'post';
  user_message: string;
  ai_response?: string;
  created_at?: string;
}

export interface Reflection {
  id?: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  energy?: number;
  soreness?: number;
  note?: string;
  created_at?: string;
}

let supabaseHealthy = hasSupabase;

const supabaseAvailable = () => hasSupabase && supabaseHealthy;

const isTableMissingError = (error: any) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  return error?.code === 'PGRST205' || message.includes("schema cache");
};

const handleSupabaseError = (error: any, context: string) => {
  if (isTableMissingError(error)) {
    if (supabaseHealthy) {
      supabaseHealthy = false;
      console.warn(`[Supabase disabled] ${context}: required tables not found. Falling back to local storage for this session.`);
    }
  } else {
    console.error(`Error ${context}:`, error);
  }
};

// Helper to get current user ID
async function getUserId(): Promise<string | null> {
  if (!hasSupabase) {
    // For local fallback, use a mock user ID
    const localUser = await getJSON<{ id: string }>('local_user');
    if (!localUser) {
      const mockId = 'local-user-' + Date.now();
      await setJSON('local_user', { id: mockId });
      return mockId;
    }
    return localUser.id;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

// Profile
export async function getProfile(): Promise<Profile | null> {
  const userId = await getUserId();
  if (!userId) return null;

  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching profile from Supabase:', error);
    }
  }

  return getJSON<Profile>('profile');
}

export async function upsertProfile(profile: Partial<Profile>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fullProfile: Profile = {
    id: userId,
    ...profile,
  } as Profile;

  if (supabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(fullProfile, { onConflict: 'id' });
      if (error) throw error;
      return;
    } catch (error) {
      handleSupabaseError(error, 'upserting profile to Supabase');
    }
  }

  await setJSON('profile', fullProfile);
}

// Subscription
export async function getSubscription(): Promise<Subscription | null> {
  const userId = await getUserId();
  if (!userId) return null;

  if (supabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      handleSupabaseError(error, 'fetching subscription from Supabase');
    }
  }

  return getJSON<Subscription>('subscription');
}

export async function setSubscription(sub: Subscription): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fullSub: Subscription = {
    ...sub,
    user_id: userId,
  };

  if (supabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert(fullSub);
      if (error) throw error;
      return;
    } catch (error) {
      handleSupabaseError(error, 'saving subscription to Supabase');
    }
  }

  await setJSON('subscription', fullSub);
}

// Assessment
export async function getAssessment(): Promise<Assessment | null> {
  const userId = await getUserId();
  if (!userId) return null;

  if (supabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      const extras = await getJSON<Pick<Assessment, 'available_days' | 'daily_minutes' | 'goal_description'>>(
        'assessment_extras'
      );
      return extras ? ({ ...data, ...extras } as Assessment) : (data as Assessment);
    } catch (error) {
      handleSupabaseError(error, 'fetching assessment from Supabase');
    }
  }

  return getJSON<Assessment>('assessment');
}

export async function setAssessment(assessment: Partial<Assessment>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const existing = await getAssessment();
  const fullAssessment: Assessment = {
    ...existing,
    ...assessment,
    user_id: userId,
    goals: assessment.goals || existing?.goals || [],
  } as Assessment;

  if (supabaseAvailable()) {
    try {
      const supabasePayload = Object.fromEntries(
        Object.entries({
          user_id: fullAssessment.user_id,
          goals: fullAssessment.goals,
          weekly_days: fullAssessment.weekly_days,
          height_cm: fullAssessment.height_cm,
          weight_kg: fullAssessment.weight_kg,
          age: fullAssessment.age,
          gender: fullAssessment.gender,
          name: fullAssessment.name,
          has_equipment: fullAssessment.has_equipment,
        }).filter(([, value]) => value !== undefined)
      );

      if (existing?.id) {
        const { error } = await supabase
          .from('assessments')
          .update(supabasePayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assessments')
          .insert(supabasePayload);
        if (error) throw error;
      }
    } catch (error) {
      handleSupabaseError(error, 'saving assessment to Supabase');
    }
  }

  await setJSON('assessment', fullAssessment);
  await setJSON('assessment_extras', {
    available_days: fullAssessment.available_days,
    daily_minutes: fullAssessment.daily_minutes,
    goal_description: fullAssessment.goal_description,
  });
}

// Plan
export async function getPlan(): Promise<WorkoutPlan | null> {
  const userId = await getUserId();
  if (!userId) return null;

  if (supabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      handleSupabaseError(error, 'fetching plan from Supabase');
    }
  }

  return getJSON<WorkoutPlan>('plan');
}

export async function setPlan(plan: WorkoutPlan): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fullPlan: WorkoutPlan = {
    ...plan,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (supabaseAvailable()) {
    try {
      const existing = await getPlan();
      const supabasePayload: any = {
        user_id: fullPlan.user_id,
        plan: fullPlan.plan,
        updated_at: fullPlan.updated_at,
      };
      if (fullPlan.program_start_date) {
        supabasePayload.program_start_date = fullPlan.program_start_date;
      }
      
      if (existing?.id) {
        const { error } = await supabase
          .from('workout_plans')
          .update(supabasePayload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workout_plans')
          .insert(supabasePayload);
        if (error) throw error;
      }
      return;
    } catch (error) {
      handleSupabaseError(error, 'saving plan to Supabase');
    }
  }

  await setJSON('plan', fullPlan);
}

// Reflections
export async function getReflections(startDate: string, endDate: string): Promise<Reflection[]> {
  const userId = await getUserId();
  if (!userId) return [];

  if (supabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'fetching reflections from Supabase');
    }
  }

  const all = await getJSON<Reflection[]>('reflections') || [];
  return all.filter(r => r.date >= startDate && r.date <= endDate);
}

export async function addReflection(reflection: Omit<Reflection, 'id' | 'user_id' | 'created_at'>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fullReflection: Reflection = {
    ...reflection,
    user_id: userId,
    created_at: new Date().toISOString(),
  };

  if (supabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('reflections')
        .insert(fullReflection);
      if (error) throw error;
      return;
    } catch (error) {
      handleSupabaseError(error, 'saving reflection to Supabase');
    }
  }

  const existing = await getJSON<Reflection[]>('reflections') || [];
  existing.push(fullReflection);
  await setJSON('reflections', existing);
}

// Check-ins
export async function getCheckIns(startDate: string, endDate: string): Promise<CheckIn[]> {
  const userId = await getUserId();
  if (!userId) return [];

  if (supabaseAvailable()) {
    try {
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, 'fetching check-ins from Supabase');
    }
  }

  const all = await getJSON<CheckIn[]>('check_ins') || [];
  return all.filter(c => c.date >= startDate && c.date <= endDate);
}

export async function addCheckIn(checkIn: Omit<CheckIn, 'id' | 'user_id' | 'created_at'>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fullCheckIn: CheckIn = {
    ...checkIn,
    user_id: userId,
    created_at: new Date().toISOString(),
  };

  if (supabaseAvailable()) {
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert(fullCheckIn);
      if (error) throw error;
      return;
    } catch (error) {
      handleSupabaseError(error, 'saving check-in to Supabase');
    }
  }

  const existing = await getJSON<CheckIn[]>('check_ins') || [];
  existing.push(fullCheckIn);
  await setJSON('check_ins', existing);
}

// Reset all (for retake)
export async function resetAll(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  if (supabaseAvailable()) {
    try {
      // Mark subscription as cancelled, delete assessment and plan
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');
      
      await supabase
        .from('assessments')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('workout_plans')
        .delete()
        .eq('user_id', userId);
      
      await supabase
        .from('check_ins')
        .delete()
        .eq('user_id', userId);
    } catch (error) {
      handleSupabaseError(error, 'resetting data in Supabase');
    }
  }

  await remove('subscription');
  await remove('assessment');
  await remove('assessment_extras');
  await remove('plan');
  await remove('reflections');
  await remove('check_ins');
}

