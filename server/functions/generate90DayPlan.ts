import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Schema for skeleton (tutorials optional)
const ExerciseTutorialSchema = z.object({
  howTo: z.string(),
  cues: z.array(z.string()),
  commonMistakes: z.array(z.string()),
});

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(1),
  reps: z.union([z.number().int().min(1), z.string().min(1)]),
  restSeconds: z.number().int().min(30).optional(),
  equipment: z.string().optional(),
  tutorial: ExerciseTutorialSchema.optional(),
});

const TrainingDaySchema = z.object({
  dayIndex: z.number().int().min(1).max(14),
  isWorkoutDay: z.boolean(),
  label: z.string(),
  focus: z.string(),
  workout: z.object({
    estimatedDurationMinutes: z.number().int().min(1),
    notes: z.string().optional(),
    exercises: z.array(ExerciseSchema),
  }).optional(),
  recovery: z.object({
    suggestions: z.array(z.string()),
  }).optional(),
});

const NutritionSchema = z.object({
  dailyMacroTargets: z.object({
    calories: z.number().int().min(0),
    proteinGrams: z.number().min(0),
    carbsGrams: z.number().min(0),
    fatsGrams: z.number().min(0),
    notes: z.string(),
  }),
});

const ProgramResponseSchema = z.object({
  meta: z.object({
    goal: z.string(),
    daysPerWeek: z.number().int().min(2).max(6),
    minutesPerWorkout: z.number().int().min(15),
    summary: z.string().optional(),
    description: z.string().optional(),
  }),
  training: z.array(TrainingDaySchema).length(14),
  nutrition: NutritionSchema,
});

// Schema for final plan (tutorials required)
const FinalExerciseSchema = ExerciseSchema.extend({
  tutorial: ExerciseTutorialSchema,
});

const FinalTrainingDaySchema = TrainingDaySchema.extend({
  workout: z.object({
    estimatedDurationMinutes: z.number().int().min(1),
    notes: z.string().optional(),
    exercises: z.array(FinalExerciseSchema),
  }).optional(),
});

const FinalProgramResponseSchema = ProgramResponseSchema.extend({
  training: z.array(FinalTrainingDaySchema).length(14),
});

type GeneratedProgram = z.infer<typeof FinalProgramResponseSchema>;
type SkeletonProgram = z.infer<typeof ProgramResponseSchema>;

// Normalize OpenAI's response to handle inconsistent formatting
function normalizeOpenAIResponse(parsed: any): any {
  // Ensure training array has exactly 14 days
  if (parsed.training && Array.isArray(parsed.training)) {
    if (parsed.training.length !== 14) {
      // If we have fewer than 14 days, pad with rest days
      while (parsed.training.length < 14) {
        const dayIndex = parsed.training.length + 1;
        parsed.training.push({
          dayIndex,
          isWorkoutDay: false,
          label: `Day ${dayIndex}`,
          focus: 'Rest',
          recovery: { suggestions: ['Focus on recovery', 'Light stretching', 'Stay hydrated'] },
        });
      }
      // If we have more than 14 days, take first 14
      parsed.training = parsed.training.slice(0, 14);
    }
    
    // Ensure each day has dayIndex
    parsed.training = parsed.training.map((day: any, index: number) => ({
      ...day,
      dayIndex: day.dayIndex || index + 1,
    }));
  }

  // Normalize exercise tutorials (only if present)
  if (parsed.training && Array.isArray(parsed.training)) {
    for (const day of parsed.training) {
      if (day.workout?.exercises) {
        for (const exercise of day.workout.exercises) {
          if (exercise.tutorial) {
            if (typeof exercise.tutorial.howTo === 'undefined') {
              exercise.tutorial.howTo = exercise.notes || 'Follow proper form and technique.';
            }
            if (!Array.isArray(exercise.tutorial.cues)) {
              exercise.tutorial.cues = [];
            }
            if (!Array.isArray(exercise.tutorial.commonMistakes)) {
              exercise.tutorial.commonMistakes = [];
            }
          }
        }
      }
    }
  }

  // Normalize recovery suggestions
  if (parsed.training && Array.isArray(parsed.training)) {
    for (const day of parsed.training) {
      if (!day.isWorkoutDay && day.recovery) {
        if (typeof day.recovery.suggestions === 'string') {
          day.recovery.suggestions = day.recovery.suggestions.split(/\n|;/).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        }
        if (!Array.isArray(day.recovery.suggestions)) {
          day.recovery.suggestions = ['Rest and recovery', 'Light mobility work', 'Stay hydrated'];
        }
      }
    }
  }

  return parsed;
}

export interface Generate90DayPlanRequest {
  assessment: Assessment;
}

interface ExerciseRef {
  dayIndex: number;
  exerciseIndex: number;
  name: string;
  label: string;
  focus: string;
  equipment: string;
}

interface TutorialResponse {
  tutorials: Array<{
    dayIndex: number;
    exerciseIndex: number;
    tutorial: {
      howTo: string;
      cues: string[];
      commonMistakes: string[];
    };
  }>;
}

/**
 * Generate the plan skeleton (structure, exercises, macros) without detailed tutorials
 */
async function generatePlanSkeleton(assessment: Assessment): Promise<SkeletonProgram> {
  const prompt = buildSkeletonPrompt(assessment);
  
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: buildSkeletonSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
          max_tokens: 1800,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonContent);

      const normalized = normalizeOpenAIResponse(parsed);
      const validated = ProgramResponseSchema.parse(normalized);
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid program structure from AI: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
      if (error instanceof z.ZodError) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid plan skeleton after retries');
}

/**
 * Enrich the skeleton plan with detailed tutorials
 */
async function enrichPlanWithTutorials(
  assessment: Assessment,
  skeleton: SkeletonProgram
): Promise<GeneratedProgram> {
  // Extract all exercises with references
  const exercises: ExerciseRef[] = [];
  for (const day of skeleton.training) {
    if (day.isWorkoutDay && day.workout?.exercises) {
      for (let i = 0; i < day.workout.exercises.length; i++) {
        const exercise = day.workout.exercises[i];
        exercises.push({
          dayIndex: day.dayIndex,
          exerciseIndex: i,
          name: exercise.name,
          label: day.label,
          focus: day.focus,
          equipment: exercise.equipment || 'Bodyweight',
        });
      }
    }
  }

  if (exercises.length === 0) {
    // No exercises to enrich, return skeleton with empty tutorials
    return skeleton as GeneratedProgram;
  }

  // Chunk exercises if needed (40 per call)
  const chunkSize = 40;
  const chunks: ExerciseRef[][] = [];
  for (let i = 0; i < exercises.length; i += chunkSize) {
    chunks.push(exercises.slice(i, i + chunkSize));
  }

  const allTutorials: TutorialResponse['tutorials'] = [];

  // Process each chunk
  for (const chunk of chunks) {
    const tutorialPrompt = buildTutorialPrompt(assessment, chunk);
    
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: buildTutorialSystemPrompt(),
              },
              {
                role: 'user',
                content: tutorialPrompt,
              },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
            max_tokens: 2000,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        
        const content = data.choices[0]?.message?.content;

        if (!content) {
          throw new Error('No content in OpenAI response');
        }

        const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(jsonContent) as TutorialResponse;

        if (parsed.tutorials && Array.isArray(parsed.tutorials)) {
          allTutorials.push(...parsed.tutorials);
        }
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        // Retry
        continue;
      }
    }
  }

  // Merge tutorials back into skeleton
  const enriched = JSON.parse(JSON.stringify(skeleton)) as GeneratedProgram;
  
  for (const tutorial of allTutorials) {
    const day = enriched.training.find(d => d.dayIndex === tutorial.dayIndex);
    if (day?.workout?.exercises[tutorial.exerciseIndex]) {
      day.workout.exercises[tutorial.exerciseIndex].tutorial = tutorial.tutorial;
    }
  }

  // Ensure all exercises have tutorials (fallback for any missing)
  for (const day of enriched.training) {
    if (day.workout?.exercises) {
      for (const exercise of day.workout.exercises) {
        if (!exercise.tutorial) {
          exercise.tutorial = {
            howTo: `Perform ${exercise.name} with proper form. Focus on controlled movement and full range of motion.`,
            cues: ['Maintain proper form throughout', 'Control the movement', 'Breathe steadily'],
            commonMistakes: ['Using momentum instead of muscle control', 'Incomplete range of motion'],
          };
        }
      }
    }
  }

  // Validate final structure
  return FinalProgramResponseSchema.parse(enriched);
}

/**
 * Main function - generates full plan with tutorials
 */
export async function generate90DayPlan(request: Generate90DayPlanRequest): Promise<GeneratedProgram> {
  const { assessment } = request;
  
  console.log('Step 1: Generating plan skeleton...');
  const skeleton = await generatePlanSkeleton(assessment);
  
  console.log('Step 2: Enriching with tutorials...');
  const fullPlan = await enrichPlanWithTutorials(assessment, skeleton);
  
  return fullPlan;
}

function buildSkeletonSystemPrompt(): string {
  return `You are an expert strength & conditioning coach and sports nutritionist.

Your job:
Design a realistic, highly personalized 14-day (2-week) training and nutrition template
that will be repeated over ~90 days. Return it in a strict JSON format.

CRITICAL: This is PHASE 1 - structure only. Do NOT include detailed tutorials yet.

GENERAL JSON RULES
- Respond with JSON ONLY, no extra text, no backticks.
- The root object must have: meta, training (14 days), nutrition.
- training must be an array of exactly 14 DayPlan objects:
  - dayIndex: 1–14
  - isWorkoutDay: boolean
  - label: string
  - focus: string
  - IF isWorkoutDay:
      workout: {
        estimatedDurationMinutes: number
        notes: string (2-3 sentences max)
        exercises: Exercise[]
      }
  - IF NOT isWorkoutDay:
      recovery: {
        suggestions: string[] (3-5 items, each 1-2 sentences describing a recovery block)
      }
- Each Exercise must include:
  {
    name: string
    sets: number
    reps: string
    restSeconds: number
    equipment: string
    tutorial: undefined (DO NOT include tutorial fields in this phase)
  }
- nutrition.dailyMacroTargets must include:
  calories, proteinGrams, carbsGrams, fatsGrams, notes (brief explanation).

WORKOUT VOLUME & STRUCTURE
- Use the user's goal, daysPerWeek, minutesPerWorkout, trainingExperience, equipment,
  injuriesOrPain, priorityAreas, and activityLevel to design the plan.
- For each workout day:
  - If minutesPerWorkout >= 60 → 5–7 exercises.
  - If 45 <= minutesPerWorkout < 60 → 4–6 exercises.
  - If 30 <= minutesPerWorkout < 45 → 3–5 exercises.
- Never return fewer than 4 exercises per workout if minutesPerWorkout >= 45.
- Each workout day should include:
  - 1 main compound or primary movement (if equipment allows),
  - 2–4 accessory or secondary movements,
  - 1 block that is either:
    - mobility/stretching, or
    - conditioning/cardio (intervals, circuits, steady-state), depending on the goal.

CARDIO / CONDITIONING FOR LEAN GOALS
- If the goal includes getting lean, fat loss, or body recomposition:
  - Do NOT make the whole plan purely weightlifting.
  - Mix in cardio/conditioning in a structured way:
    - At least 1–3 dedicated cardio/conditioning sessions or blocks per week.
    - Examples: interval runs, incline treadmill, cycling intervals, sled pushes, conditioning circuits.
  - You can:
    - Make some days primarily lifting with a conditioning finisher, and
    - Make other days primarily cardio/conditioning, especially if daysPerWeek is high.
  - Clarify in workout.notes how the cardio/conditioning helps fat loss or leanness.

PERSONALIZATION RULES
- Personalize the plan based on:
  - Goal (fat loss, muscle gain, recomposition, flexibility, performance, etc.)
  - trainingExperience (beginner / intermediate / advanced)
  - injuriesOrPain (avoid or modify risky movements and note safer options)
  - equipment (only use equipment they actually have)
  - priorityAreas (e.g. glutes, posture, arms, hamstrings; bias volume and attention towards these)
  - activityLevel (impacts calorie estimate and recovery emphasis).
- Reflect personalization in:
  - meta.summary and meta.description:
    - Mention age, goal, experience, equipment context, and key priorities in natural language.
  - day labels:
    - Use descriptive labels like "Glute-Biased Lower", "Posture & Upper Back", "Cardio + Core".
  - workout.notes:
    - 2–3 sentences explaining why today's session looks this way for THIS user:
      - How it supports their goal.
      - How it considers their injuries or weak points.
      - How it fits into the broader 90-day arc.

GOAL-SPECIFIC LOGIC
- If the goal mentions flexibility or mobility:
  - Every workout day must include at least 1 dedicated mobility or stretching block as an exercise entry.
  - Favor long-range-of-motion exercises: deep goblet squats, Romanian deadlifts, Cossack squats, etc.
  - Recovery days should prescribe specific mobility flows (e.g. "Block 1 – 10-min hip flexor + hamstring flow: 2 rounds of 30s couch stretch per side, 30s 90/90 hip switches, 30s deep squat hold").
  - Explain in workout.notes how today's work helps them move better and feel less stiff.
- If the goal is hypertrophy / muscle gain:
  - Focus on 6–12 rep ranges with enough weekly sets per muscle group.
  - Ensure at least 2 exposures per week for priority muscles.
- If the goal is fat loss or "getting lean":
  - Include both resistance training and cardio/conditioning in a structured way.
  - Emphasize energy expenditure, NEAT, and maintaining muscle tissue.
  - Mention step targets, brisk walking, or similar in recovery days and notes.

RECOVERY DAYS AS REAL ROUTINES
- Recovery days should feel like actionable routines, not vague advice.
- In recovery.suggestions, each string should describe a specific "block" of a recovery routine, for example:
  - "Block 1 – 10-min hip mobility: 2 rounds of 30s couch stretch per side, 30s 90/90 hip switches, 30s deep squat hold."
  - "Block 2 – Breathing reset: 5 minutes of 4-6 breathing lying on your back with feet on a bench."
- Provide 3–5 such blocks per recovery day, so that if the user taps a recovery day,
  they can follow a concrete sequence.
- Tailor recovery suggestions to:
  - injuriesOrPain,
  - priorityAreas,
  - and activityLevel (more active users may need more mobility, less neural fatigue).

PROGRESSION LOGIC
- Assume the user repeats this 14-day template for about 90 days.
- In each workout.notes, give specific progression guidance, such as:
  - How to add load, reps, or sets over successive cycles.
  - When to back off or deload.
- Provide at least one concrete performance benchmark somewhere in the plan, such as:
  - "Aim to build up to holding these side planks for 45–60 seconds per side with perfect form."
  - "By the end of 8 weeks, many people can add 10–20 kg to their deadlift if they follow this structure."

NUTRITION LOGIC
- Use the user's age, sex, height, weight, activityLevel, and goal to estimate maintenance calories.
- Then set daily calories:
  - Muscle gain: ~5–15% above estimated maintenance.
  - Fat loss / getting lean: ~15–25% below estimated maintenance.
  - Primarily flexibility/mobility with no strong body-composition goal: near maintenance.
- Set proteinGrams to roughly 0.8–1.0 g per pound of bodyweight (less aggressive if user is obese).
- Ensure fatsGrams are at least ~0.3 g per pound of bodyweight.
- carbsGrams can fill the remaining calories.
- In dailyMacroTargets.notes:
  - Explain clearly WHY these numbers were chosen for this user:
    - Reference height, weight, goal, training frequency, and activityLevel.
    - Mention if this is a deficit, surplus, or maintenance.
    - Mention what they should focus on (e.g., "prioritize hitting protein and staying within ~100 kcal of this target").

LENGTH LIMITS
- Keep workout.notes to 2-3 sentences.
- Keep each recovery.suggestions item to 1-2 sentences.
- Keep nutrition.dailyMacroTargets.notes to 2-3 sentences.
- Do NOT include tutorial fields (howTo, cues, commonMistakes) in exercises.`;
}

function buildTutorialSystemPrompt(): string {
  return `You are an expert strength & conditioning coach.

Your job:
Generate detailed, personalized exercise tutorials for a specific user.

This is PHASE 2 - tutorials only. You will receive a list of exercises and user profile.
Return JSON with tutorials for each exercise.

GENERAL JSON RULES
- Respond with JSON ONLY, no extra text, no backticks.
- Root object: { "tutorials": EnrichedTutorial[] }
- Each EnrichedTutorial:
  {
    "dayIndex": number,
    "exerciseIndex": number,
    "tutorial": {
      "howTo": string,
      "cues": string[],
      "commonMistakes": string[]
    }
  }

TUTORIAL QUALITY REQUIREMENTS
- Tutorials must be VERY detailed and practical, not vague.
- For howTo:
  - Write 2-4 dense sentences covering: setup, position, movement path, breathing, safety.
  - Mention important details like joint angles, torso position, breathing, range of motion.
  - Adjust for the user's experience level and injuries if relevant.
- For cues:
  - Provide 3-4 vivid, specific cues that paint a clear picture.
  - Avoid shallow cues like "engage core" or "squeeze shoulders" as the only advice.
  - Examples: "Imagine you are bending the bar to engage your lats", "Keep your ribs stacked over your pelvis to avoid hyperextending your lower back".
- For commonMistakes:
  - List 3 short sentences (mistake + what to do instead).
  - Explain why each mistake is bad and what the user should do instead.

PERSONALIZATION
- Use the user's profile to tailor tutorials:
  - trainingExperience: Adjust complexity and detail level.
  - injuriesOrPain: Provide modifications and safer alternatives.
  - priorityAreas: Emphasize form cues relevant to those areas.
  - equipment: Reference the specific equipment they have.
- Make the language feel like a coach talking to this specific user.
- For example, if they have knee pain, explain how to tweak squats to reduce stress on the knees.

LENGTH LIMITS
- Keep total response under ~2,000 words.
- Each howTo: 2-4 dense sentences.
- Each cues array: 3-4 items.
- Each commonMistakes array: 3 items.`;
}

function buildSkeletonPrompt(assessment: Assessment): string {
  const age = assessment.age || 30;
  const weight_kg = assessment.weight_kg || 70;
  const height_cm = assessment.height_cm || 170;
  const gender = assessment.gender || 'male';
  const weekly_days = assessment.weekly_days || 3;
  const daily_minutes = assessment.daily_minutes || 45;
  const training_experience = assessment.training_experience || 'intermediate';
  const injuries_or_pain = assessment.injuries_or_pain || 'none';
  const priority_areas = assessment.priority_areas || 'none';
  const activity_level = assessment.activity_level || 'moderately_active';
  
  let equipmentDescription = 'No equipment (bodyweight only)';
  if (assessment.has_equipment) {
    equipmentDescription = 'Full gym access (barbells, dumbbells, machines, cables, etc.)';
  } else if (assessment.equipment) {
    const equipmentList = Array.isArray(assessment.equipment) 
      ? assessment.equipment.join(', ')
      : assessment.equipment;
    equipmentDescription = `Limited equipment: ${equipmentList}`;
  }

  const lines: string[] = [
    `User profile for training and nutrition:`,
    '',
    `- Age: ${age}`,
    `- Sex: ${gender}`,
    `- Height: ${height_cm} cm`,
    `- Weight: ${weight_kg} kg`,
    `- Goal: ${assessment.goals?.join(', ') || 'General fitness'}`,
    `- Training experience: ${training_experience}`,
    `- Days per week available to train: ${weekly_days}`,
    `- Minutes available per workout: ${daily_minutes}`,
    `- Daily activity level: ${activity_level}`,
    `- Available equipment: ${equipmentDescription}`,
    `- Injuries or pain: ${injuries_or_pain}`,
    `- Priority areas: ${priority_areas}`,
  ];

  if (assessment.goal_description) {
    lines.push(`- Goal description: ${assessment.goal_description}`);
  }

  if (assessment.available_days && assessment.available_days.length > 0) {
    lines.push(`- Preferred training days: ${assessment.available_days.join(', ')}`);
  }

  lines.push(
    '',
    `Generate the 14-day plan structure. Do NOT include tutorial fields in exercises.`,
  );

  return lines.join('\n');
}

function buildTutorialPrompt(assessment: Assessment, exercises: ExerciseRef[]): string {
  const age = assessment.age || 30;
  const weight_kg = assessment.weight_kg || 70;
  const height_cm = assessment.height_cm || 170;
  const gender = assessment.gender || 'male';
  const training_experience = assessment.training_experience || 'intermediate';
  const injuries_or_pain = assessment.injuries_or_pain || 'none';
  const priority_areas = assessment.priority_areas || 'none';
  
  let equipmentDescription = 'No equipment (bodyweight only)';
  if (assessment.has_equipment) {
    equipmentDescription = 'Full gym access (barbells, dumbbells, machines, cables, etc.)';
  } else if (assessment.equipment) {
    const equipmentList = Array.isArray(assessment.equipment) 
      ? assessment.equipment.join(', ')
      : assessment.equipment;
    equipmentDescription = `Limited equipment: ${equipmentList}`;
  }

  const exerciseList = exercises.map((ex, idx) => 
    `${idx + 1}. Day ${ex.dayIndex} (${ex.label} - ${ex.focus}): ${ex.name} (Equipment: ${ex.equipment})`
  ).join('\n');

  return `User profile:
- Age: ${age}, Sex: ${gender}, Height: ${height_cm}cm, Weight: ${weight_kg}kg
- Goal: ${assessment.goals?.join(', ') || 'General fitness'}
- Training experience: ${training_experience}
- Injuries or pain: ${injuries_or_pain}
- Priority areas: ${priority_areas}
- Available equipment: ${equipmentDescription}

Exercises to create tutorials for:
${exerciseList}

For each exercise, provide detailed tutorials that are personalized to this user's profile, experience level, and any injuries or limitations.`;
}
