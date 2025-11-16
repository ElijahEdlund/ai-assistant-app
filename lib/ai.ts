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

/**
 * Maps a day number (1-90) to the corresponding template day index (1-14)
 * Uses modulo logic: templateDayIndex = ((dayNumber - 1) % 14) + 1
 */
export function getTemplateDayIndex(dayNumber: number): number {
  if (dayNumber < 1 || dayNumber > 90) {
    throw new Error(`Day number must be between 1 and 90, got ${dayNumber}`);
  }
  return ((dayNumber - 1) % 14) + 1;
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

    // Transform the 2-week template into a 90-day program
    // The template has 14 days, we'll map days 1-90 to template days 1-14 using modulo
    const templateDays = generatedProgram.training || [];
    
    // Build workouts for all 90 days
    const workouts: any[] = [];
    
    for (let dayNumber = 1; dayNumber <= 90; dayNumber++) {
      const templateDayIndex = getTemplateDayIndex(dayNumber);
      const templateDay = templateDays.find((d: any) => d.dayIndex === templateDayIndex) || templateDays[templateDayIndex - 1];
      
      if (templateDay && templateDay.isWorkoutDay && templateDay.workout?.exercises) {
        // Calculate date for this day
        const workoutDate = new Date(startDate);
        workoutDate.setDate(workoutDate.getDate() + (dayNumber - 1));
        
        workouts.push({
          id: `day-${dayNumber}`,
          day: dayNumber,
          name: templateDay.label,
          focus: templateDay.focus,
          scheduledDate: workoutDate.toISOString().split('T')[0],
          exercises: templateDay.workout.exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.restSeconds ? `${ex.restSeconds}s` : '60s',
            equipment: ex.equipment,
            tutorial: ex.tutorial || {
              howTo: ex.notes || 'Follow proper form and technique.',
              cues: [],
              commonMistakes: [],
            },
          })),
        });
      }
    }

    // Create the plan structure with the 2-week template
    const plan: WorkoutPlan = {
      user_id: assessment.user_id,
      program_start_date: programStartDate,
      plan: {
        programLengthDays: 90,
        startDate: programStartDate,
        // Store the 2-week template
        template: {
          meta: generatedProgram.meta,
          training: templateDays,
          nutrition: generatedProgram.nutrition,
        },
        // Store workouts mapped to dates for easy lookup
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

