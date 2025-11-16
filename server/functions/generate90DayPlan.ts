import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Schema for the 2-week template program response
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
  tutorial: ExerciseTutorialSchema,
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

type GeneratedProgram = z.infer<typeof ProgramResponseSchema>;

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

  // Normalize exercise tutorials
  if (parsed.training && Array.isArray(parsed.training)) {
    for (const day of parsed.training) {
      if (day.workout?.exercises) {
        for (const exercise of day.workout.exercises) {
          if (!exercise.tutorial) {
            exercise.tutorial = {
              howTo: exercise.notes || 'Follow proper form and technique.',
              cues: [],
              commonMistakes: [],
            };
          }
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

export async function generate90DayPlan(request: Generate90DayPlanRequest): Promise<GeneratedProgram> {
  const { assessment } = request;
  const prompt = buildPrompt(assessment);

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
              content: `You are an expert strength coach and nutritionist. Your task is to create a comprehensive 2-week (14-day) training template that will be repeated to fill a 90-day program.

CRITICAL REQUIREMENTS:
1. Generate exactly 14 days of training (dayIndex 1-14)
2. Each workout day MUST include:
   - Full exercise details with name, sets, reps, restSeconds, equipment
   - Complete tutorial for EACH exercise with:
     * howTo: Step-by-step instructions (2-4 sentences)
     * cues: Array of 3-5 short coaching cues (e.g., ["Keep core tight", "Drive through heels"])
     * commonMistakes: Array of 2-4 common mistakes to avoid
3. Rest days MUST include recovery suggestions (array of 3-5 tips)
4. Provide ONE set of daily macro targets tailored to the user's profile
5. Return ONLY valid JSON matching the exact schema - no markdown, no explanations, no code blocks`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
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

      // Parse JSON (remove markdown code blocks if present)
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonContent);

      // Normalize the response to handle OpenAI's inconsistent formatting
      const normalized = normalizeOpenAIResponse(parsed);

      // Validate with Zod
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
      // Retry on validation error
      if (error instanceof z.ZodError) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid plan after retries');
}

function buildPrompt(assessment: Assessment): string {
  // Calculate BMR and activity level for nutrition
  const age = assessment.age || 30;
  const weight_kg = assessment.weight_kg || 70;
  const height_cm = assessment.height_cm || 170;
  const gender = assessment.gender || 'male';
  const weekly_days = assessment.weekly_days || 3;
  const daily_minutes = assessment.daily_minutes || 45;
  
  // Estimate activity level
  const weeklyMinutes = weekly_days * daily_minutes;
  let activityLevel = 'sedentary';
  if (weeklyMinutes >= 300) activityLevel = 'very_active';
  else if (weeklyMinutes >= 150) activityLevel = 'active';
  else if (weeklyMinutes >= 75) activityLevel = 'moderately_active';
  else activityLevel = 'lightly_active';

  const lines: string[] = [
    `Create a comprehensive 2-week (14-day) training template for this client. This template will be repeated to create a 90-day program.`,
    '',
    `**Client Profile:**`,
    `- Age: ${age}`,
    `- Gender: ${gender}`,
    `- Height: ${height_cm} cm`,
    `- Weight: ${weight_kg} kg`,
    `- Training days per week: ${weekly_days}`,
    `- Daily training time: ${daily_minutes} minutes`,
    `- Equipment access: ${assessment.has_equipment ? 'Yes (full gym with weights, machines, etc.)' : 'No (bodyweight and minimal equipment only)'}`,
    `- Primary goals: ${assessment.goals?.join(', ') || 'General fitness'}`,
  ];

  if (assessment.goal_description) {
    lines.push(`- Goal description: ${assessment.goal_description}`);
  }

  if (assessment.available_days && assessment.available_days.length > 0) {
    lines.push(`- Preferred training days: ${assessment.available_days.join(', ')}`);
  }

  lines.push(
    '',
    `**CRITICAL REQUIREMENTS:**`,
    '',
    `1. TRAINING TEMPLATE (14 days):`,
    `   - Create exactly 14 days (dayIndex 1-14)`,
    `   - Distribute ${weekly_days} workout days across the 14-day period`,
    `   - Each workout day MUST include:`,
    `     * dayIndex (1-14)`,
    `     * isWorkoutDay: true`,
    `     * label: Descriptive name (e.g., "Push Day", "Legs & Glutes", "Upper Body Strength")`,
    `     * focus: Primary muscle groups or training focus`,
    `     * workout object with:`,
    `       - estimatedDurationMinutes: ${daily_minutes}`,
    `       - notes: Brief workout notes (optional)`,
    `       - exercises: Array of exercises, each with:`,
    `         * name: Exercise name`,
    `         * sets: Number of sets (typically 3-5)`,
    `         * reps: Number or range (e.g., 8, "8-10", "12-15")`,
    `         * restSeconds: Rest time between sets (typically 60-180)`,
    `         * equipment: Required equipment`,
    `         * tutorial: {`,
    `           - howTo: Step-by-step instructions (2-4 sentences explaining proper form)`,
    `           - cues: Array of 3-5 short coaching cues (e.g., ["Keep core engaged", "Drive through heels", "Control the eccentric"])`,
    `           - commonMistakes: Array of 2-4 common mistakes (e.g., ["Rounding the back", "Using momentum", "Not going full range of motion"])`,
    `         }`,
    `   - Each rest day MUST include:`,
    `     * dayIndex (1-14)`,
    `     * isWorkoutDay: false`,
    `     * label: "Rest Day" or "Recovery Day"`,
    `     * focus: "Recovery"`,
    `     * recovery object with:`,
    `       - suggestions: Array of 3-5 recovery tips (e.g., ["Light stretching", "Foam rolling", "Stay hydrated", "Quality sleep"])`,
    '',
    `2. NUTRITION:`,
    `   - Provide ONE set of daily macro targets (same for all days):`,
    `     * calories: Based on ${gender}, age ${age}, weight ${weight_kg}kg, height ${height_cm}cm, activity level: ${activityLevel}`,
    `     * proteinGrams: Typically 1.6-2.2g per kg body weight for muscle building`,
    `     * carbsGrams: Based on goals and activity`,
    `     * fatsGrams: Typically 0.8-1.2g per kg body weight`,
    `     * notes: Brief explanation of the macro strategy`,
    '',
    `3. META INFORMATION:`,
    `   - goal: Primary fitness goal`,
    `   - daysPerWeek: ${weekly_days}`,
    `   - minutesPerWorkout: ${daily_minutes}`,
    `   - summary: High-level program summary (optional)`,
    `   - description: Program description (optional)`,
    '',
    `**Equipment Constraints:**`,
    `${assessment.has_equipment ? 'Use full gym equipment: barbells, dumbbells, machines, cables, etc.' : 'ONLY use bodyweight exercises and minimal equipment (resistance bands, pull-up bar if available). NO weights, machines, or gym equipment.'}`,
    '',
    `**Goal Alignment:**`,
    `Tailor exercises and intensity to: ${assessment.goals?.join(', ') || 'general fitness'}`,
    '',
    `Respond with ONLY valid JSON matching this structure (no markdown, no code blocks):`,
    `{`,
    `  "meta": {`,
    `    "goal": "...",`,
    `    "daysPerWeek": ${weekly_days},`,
    `    "minutesPerWorkout": ${daily_minutes},`,
    `    "summary": "...",`,
    `    "description": "..."`,
    `  },`,
    `  "training": [`,
    `    {`,
    `      "dayIndex": 1,`,
    `      "isWorkoutDay": true,`,
    `      "label": "Push Day",`,
    `      "focus": "Chest, Shoulders, Triceps",`,
    `      "workout": {`,
    `        "estimatedDurationMinutes": ${daily_minutes},`,
    `        "notes": "...",`,
    `        "exercises": [`,
    `          {`,
    `            "name": "Bench Press",`,
    `            "sets": 4,`,
    `            "reps": "8-10",`,
    `            "restSeconds": 120,`,
    `            "equipment": "Barbell, Bench",`,
    `            "tutorial": {`,
    `              "howTo": "Lie on bench with feet flat. Grip bar slightly wider than shoulders. Lower to chest with control, pause, then press up explosively.",`,
    `              "cues": ["Keep shoulder blades retracted", "Drive through feet", "Control the descent"],`,
    `              "commonMistakes": ["Bouncing bar off chest", "Arching back excessively", "Flaring elbows too wide"]`,
    `            }`,
    `          }`,
    `        ]`,
    `      }`,
    `    },`,
    `    {`,
    `      "dayIndex": 2,`,
    `      "isWorkoutDay": false,`,
    `      "label": "Rest Day",`,
    `      "focus": "Recovery",`,
    `      "recovery": {`,
    `        "suggestions": ["Light stretching", "Foam rolling", "Stay hydrated", "Quality sleep"]`,
    `      }`,
    `    }`,
    `    // ... continue for all 14 days`,
    `  ],`,
    `  "nutrition": {`,
    `    "dailyMacroTargets": {`,
    `      "calories": 2500,`,
    `      "proteinGrams": 140,`,
    `      "carbsGrams": 300,`,
    `      "fatsGrams": 70,`,
    `      "notes": "Calorie target supports muscle building with adequate protein for recovery."`,
    `    }`,
    `  }`,
    `}`,
  );

  return lines.join('\n');
}

