// AI utility functions for client-side use
// Note: OpenAI API calls should only be made from server functions

import type { Assessment, WorkoutPlan } from './data/dataClient';

export interface PlanGenerationRequest {
  goalTitle: string;
  goalDescription?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  timeframeWeeks: number;
  dailyMinutes: number;
  preferredWindows: string[];
  constraints?: string;
}

export interface GeneratedMilestone {
  title: string;
  description: string;
  day_index: number;
}

export interface GeneratedTask {
  title: string;
  description: string;
  day_index: number;
  duration_min: number;
  preferred_window: string; // e.g., "09:00-12:00"
}

export interface GeneratedPlan {
  milestones: GeneratedMilestone[];
  tasks: GeneratedTask[];
}

// This function should call the server function, not OpenAI directly
// Note: In production, deploy server/functions/generatePlan.ts as an API endpoint
// (e.g., Vercel Edge Function, Supabase Edge Function, etc.)
export async function generatePlan(request: PlanGenerationRequest): Promise<GeneratedPlan> {
  // TODO: Replace with your deployed server function URL
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api/generate-plan';
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Plan generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data;
}

export interface CoachHintRequest {
  streakDays: number;
  onTimePercentage: number;
  completionRate: number;
  recentCheckins: number;
  tone: 'encouraging' | 'motivational' | 'analytical';
}

export async function generateCoachHint(request: CoachHintRequest): Promise<string> {
  // TODO: Replace with your deployed server function URL
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com/api/coach-hint';
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Coach hint generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.hint || 'Keep up the great work!';
  } catch (error) {
    console.error('Error generating coach hint:', error);
    // Fallback hints
    if (request.streakDays >= 7) {
      return 'You\'re on fire! Keep this momentum going.';
    } else if (request.completionRate >= 80) {
      return 'Great progress! You\'re staying consistent.';
    } else if (request.completionRate < 50) {
      return 'Try to focus on completing at least one task per day to build momentum.';
    }
    return 'Every step forward counts. Keep going!';
  }
}

export interface Generate90DayPlanResponse {
  programLengthDays: number;
  training: any;
  nutrition: any;
}

export async function generate90DayPlan(assessment: Assessment): Promise<WorkoutPlan> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined. Cannot generate 90-day plan.');
  }

  try {
    const url = `${API_URL}/api/generate-90day-plan`;
    console.log('Calling API endpoint:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment }),
    });

    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText.substring(0, 500));
      throw new Error(`90-day plan generation failed: ${response.status} ${errorText.substring(0, 200)}`);
    }

    const generatedProgram = await response.json();
    
    // Calculate start date (tomorrow)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const programStartDate = startDate.toISOString().split('T')[0];

    // Transform the generated program into our WorkoutPlan format
    // Map training days to workouts with scheduled dates
    const workouts: any[] = [];
    const nutritionDays: any[] = generatedProgram.nutrition?.days || [];

    // Build workouts from training weeks
    // Map dayNumber (1-90) to actual calendar dates based on program start
    if (generatedProgram.training?.weeks) {
      for (const week of generatedProgram.training.weeks) {
        for (const day of week.days) {
          if (!day.isRestDay && day.exercises && day.exercises.length > 0) {
            // Calculate date based on dayNumber (day 1 = startDate, day 2 = startDate + 1, etc.)
            const workoutDate = new Date(startDate);
            workoutDate.setDate(workoutDate.getDate() + (day.dayNumber - 1));
            
            workouts.push({
              id: `day-${day.dayNumber}`,
              week: week.weekNumber,
              day: day.dayNumber,
              name: day.label,
              focus: day.primaryFocus,
              scheduledDate: workoutDate.toISOString().split('T')[0],
              exercises: day.exercises.map((ex: any) => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.restSeconds ? `${ex.restSeconds}s` : '60s',
                tempo: ex.tempo,
                notes: ex.notes,
                rir: ex.rir,
              })),
            });
          }
        }
      }
    }

    // Create the plan structure
    const plan: WorkoutPlan = {
      user_id: assessment.user_id,
      program_start_date: programStartDate,
      plan: {
        programLengthDays: 90,
        startDate: programStartDate,
        training: generatedProgram.training,
        nutrition: generatedProgram.nutrition,
        workouts,
        goals: assessment.goals,
        weeklyDays: assessment.weekly_days,
      },
    };

    return plan;
  } catch (error) {
    console.error('Error generating 90-day plan:', error);
    throw error;
  }
}

export async function generateCheckInResponse(
  userMessage: string,
  checkInType: 'pre' | 'post',
  context?: { dayNumber?: number; workoutName?: string }
): Promise<string> {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  if (!API_URL) {
    // Fallback response if API is not configured
    return checkInType === 'pre'
      ? 'Great! Stay focused and give it your best effort today. Remember to warm up properly and listen to your body.'
      : 'Well done! Recovery is just as important as training. Make sure to hydrate and get some rest.';
  }

  try {
    const response = await fetch(`${API_URL}/api/coach-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        type: checkInType,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Check-in response generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || 'Keep up the great work!';
  } catch (error) {
    console.error('Error generating check-in response:', error);
    // Return fallback
    return checkInType === 'pre'
      ? 'Great! Stay focused and give it your best effort today. Remember to warm up properly and listen to your body.'
      : 'Well done! Recovery is just as important as training. Make sure to hydrate and get some rest.';
  }
}

