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
    // Step 1: Generate blueprint
    console.log('Step 1: Generating plan blueprint...');
    const blueprintUrl = `${API_URL}/api/plan-blueprint`;
    const blueprintResponse = await fetch(blueprintUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment }),
    });

    if (!blueprintResponse.ok) {
      const errorText = await blueprintResponse.text();
      console.error('Blueprint API error response:', errorText.substring(0, 500));
      throw new Error(`Plan blueprint generation failed: ${blueprintResponse.status} ${errorText.substring(0, 200)}`);
    }

    const blueprint = await blueprintResponse.json();
    console.log('Blueprint generated successfully');

    // Step 2: Generate details in parallel (split into smaller, faster calls)
    console.log('Step 2: Generating plan details (workouts, recovery, coach notes)...');
    
    // Separate day types into workout days and recovery days
    const workoutDayTypes = blueprint.splitDesign.dayTypes
      .filter((dt: any) => !dt.isRecoveryDay)
      .map((dt: any) => dt.id);
    const recoveryDayTypes = blueprint.splitDesign.dayTypes
      .filter((dt: any) => dt.isRecoveryDay)
      .map((dt: any) => dt.id);

    // Split workout days into batches of 2-3 to prevent timeouts
    const batchSize = 3;
    const workoutBatches: string[][] = [];
    for (let i = 0; i < workoutDayTypes.length; i += batchSize) {
      workoutBatches.push(workoutDayTypes.slice(i, i + batchSize));
    }

    // Generate workout details in batches, then combine
    console.log(`Generating workout details in ${workoutBatches.length} batch(es)...`);
    const workoutDetailsPromises = workoutBatches.map((batch, index) => {
      console.log(`Batch ${index + 1}/${workoutBatches.length}: ${batch.join(', ')}`);
      return fetch(`${API_URL}/api/plan-details-workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assessment, 
          blueprint, 
          dayTypeIds: batch 
        }),
      });
    });

    // Call all endpoints in parallel (workout batches + recovery + coach notes)
    const allResponses = await Promise.all([
      ...workoutDetailsPromises,
      recoveryDayTypes.length > 0 ? fetch(`${API_URL}/api/plan-details-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assessment, 
          blueprint, 
          dayTypeIds: recoveryDayTypes 
        }),
      }) : Promise.resolve({ ok: true, json: async () => ({}) }),
      fetch(`${API_URL}/api/plan-details-coach-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, blueprint }),
      }),
    ]);

    // Separate responses
    const workoutResponses = allResponses.slice(0, workoutBatches.length);
    const recoveryResponse = allResponses[workoutBatches.length];
    const coachNotesResponse = allResponses[workoutBatches.length + 1];

    // Check workout batch responses
    for (let i = 0; i < workoutResponses.length; i++) {
      if (!workoutResponses[i].ok) {
        const errorText = await workoutResponses[i].text();
        throw new Error(`Workout details batch ${i + 1} failed: ${workoutResponses[i].status} ${errorText.substring(0, 200)}`);
      }
    }
      recoveryDayTypes.length > 0 ? fetch(`${API_URL}/api/plan-details-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          assessment, 
          blueprint, 
          dayTypeIds: recoveryDayTypes 
        }),
      }) : Promise.resolve({ ok: true, json: async () => ({}) }),
      fetch(`${API_URL}/api/plan-details-coach-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment, blueprint }),
      }),
    ]);

    // Check recovery and coach notes responses
    if (recoveryDayTypes.length > 0 && !recoveryResponse.ok) {
      const errorText = await recoveryResponse.text();
      throw new Error(`Recovery details generation failed: ${recoveryResponse.status} ${errorText.substring(0, 200)}`);
    }
    if (!coachNotesResponse.ok) {
      const errorText = await coachNotesResponse.text();
      throw new Error(`Coach notes generation failed: ${coachNotesResponse.status} ${errorText.substring(0, 200)}`);
    }

    // Parse all responses and combine workout batches
    const workoutDetailsBatches = await Promise.all(workoutResponses.map(r => r.json()));
    const workoutsDetails = Object.assign({}, ...workoutDetailsBatches);
    const recoveryDetailsRaw = recoveryDayTypes.length > 0 ? await recoveryResponse.json() : {};
    const coachNotes = await coachNotesResponse.json();
    
    console.log('All details generated successfully');

    // Transform recovery details to match expected structure
    // Recovery endpoint returns { dayTypeId: { name, recoveryRoutine } }
    // We need { dayTypeId: { name, recoveryRoutine } } - it's already correct!
    const recoveryDetails = recoveryDetailsRaw;
    
    // Combine into the expected details structure
    // Note: workoutsDetails and recoveryDetails are already keyed by dayTypeId
    const details = {
      dayTypeDetails: {
        ...workoutsDetails,
        ...recoveryDetails,
      },
      globalCoachNotes: coachNotes,
    };

    // Step 3: Transform blueprint + details into the expected plan structure
    const transformedPlan = transformBlueprintAndDetailsToPlan(blueprint, details, assessment);
    
    return transformedPlan;
  } catch (error) {
    console.error('Error generating 90-day plan:', error);
    throw error;
  }
}

/**
 * Transforms blueprint + details into the WorkoutPlan structure expected by the app
 */
function transformBlueprintAndDetailsToPlan(
  blueprint: any,
  details: any,
  assessment: Assessment
): WorkoutPlan {
  // Calculate start date (tomorrow)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const programStartDate = startDate.toISOString().split('T')[0];

  // Build the 14-day template by combining blueprint structure with details
  const templateDays: any[] = [];
  const microcycleTemplate = blueprint.splitDesign.microcycleTemplate;
  const dayTypes = blueprint.splitDesign.dayTypes;

  for (const templateDay of microcycleTemplate) {
    const dayType = dayTypes.find((dt: any) => dt.id === templateDay.dayTypeId);
    if (!dayType) continue;

    const dayDetails = details.dayTypeDetails[templateDay.dayTypeId];
    if (!dayDetails) continue;

    const isRecoveryDay = dayType.isRecoveryDay;
    
    // Collect all exercises from blocks
    const allExercises: any[] = [];
    if (dayDetails.blocks) {
      for (const block of dayDetails.blocks) {
        if (block.exercises) {
          for (const exercise of block.exercises) {
            allExercises.push({
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              equipment: exercise.equipment,
              tutorial: {
                howTo: exercise.howTo || exercise.cues?.join(' ') || 'Follow proper form and technique.',
                cues: exercise.cues || [],
                commonMistakes: exercise.commonMistakes || [],
                progressionTips: exercise.progressionTips || [],
              },
            });
          }
        }
      }
    }

    // Build the template day
    const templateDayObj: any = {
      dayIndex: templateDay.dayIndex,
      isWorkoutDay: !isRecoveryDay,
      label: dayType.label,
      focus: dayType.focusDescription,
    };

    if (isRecoveryDay) {
      // Recovery day
      templateDayObj.recovery = {
        suggestions: dayDetails.recoveryRoutine?.steps || [],
      };
    } else {
      // Workout day
      // Estimate duration based on exercise count (rough estimate: 5 min per exercise + warmup)
      const estimatedDuration = Math.max(30, allExercises.length * 5 + 10);
      
      // Build workout notes with warmup, focus, and cardio
      let workoutNotes = dayDetails.trainingFocus || '';
      
      // Add warmup information
      if (dayDetails.warmup?.description) {
        workoutNotes = `Warmup: ${dayDetails.warmup.description}\n\n${workoutNotes}`;
      }
      
      // Add cardio protocol if included
      if (dayDetails.cardioProtocol?.isIncluded) {
        workoutNotes += `\n\nCardio: ${dayDetails.cardioProtocol.description}`;
      }
      
      templateDayObj.workout = {
        estimatedDurationMinutes: estimatedDuration,
        notes: workoutNotes,
        exercises: allExercises,
        warmup: dayDetails.warmup ? {
          description: dayDetails.warmup.description,
          steps: dayDetails.warmup.steps,
        } : undefined,
      };
    }

    templateDays.push(templateDayObj);
  }

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

  // Build meta from blueprint
  const meta = {
    goal: blueprint.programOverview.primaryGoal,
    daysPerWeek: blueprint.userProfile.trainingDaysPerWeek,
    minutesPerWorkout: blueprint.userProfile.sessionLengthMinutes,
    summary: blueprint.programOverview.summary,
    description: blueprint.programOverview.title,
  };

  // Build nutrition from blueprint
  const nutrition = {
    dailyMacroTargets: {
      calories: blueprint.nutritionOverview.dailyMacros.calories,
      proteinGrams: blueprint.nutritionOverview.dailyMacros.proteinGrams,
      carbsGrams: blueprint.nutritionOverview.dailyMacros.carbsGrams,
      fatsGrams: blueprint.nutritionOverview.dailyMacros.fatsGrams,
      notes: details.globalCoachNotes.nutritionStrategy || blueprint.nutritionOverview.guidelines.join('\n'),
    },
  };

  // Create the plan structure
  const plan: WorkoutPlan = {
    user_id: assessment.user_id,
    program_start_date: programStartDate,
    plan: {
      programLengthDays: 90,
      startDate: programStartDate,
      // Store the 2-week template
      template: {
        meta,
        training: templateDays,
        nutrition,
        // Store additional coach notes
        coachNotes: details.globalCoachNotes,
        blueprint: blueprint, // Store blueprint for reference
      },
      // Store workouts mapped to dates for easy lookup
      workouts,
      goals: assessment.goals,
      weeklyDays: assessment.weekly_days,
    },
  };

  return plan;
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

