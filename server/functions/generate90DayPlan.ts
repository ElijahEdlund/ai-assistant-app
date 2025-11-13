import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// Schema for the 90-day program response
const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().min(1),
  reps: z.union([z.number().int().min(1), z.string().min(1)]),
  rir: z.number().int().min(0).max(3).optional(),
  restSeconds: z.number().int().min(30).optional(),
  tempo: z.string().optional(),
  notes: z.string().optional(),
});

const TrainingDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(90),
  label: z.string(),
  isRestDay: z.boolean(),
  primaryFocus: z.string(),
  exercises: z.array(ExerciseSchema).optional(),
});

const PhaseSchema = z.object({
  name: z.string(),
  weeks: z.array(z.number().int().min(1).max(13)),
  goal: z.string(),
});

const WeekSchema = z.object({
  weekNumber: z.number().int().min(1).max(13),
  focus: z.string(),
  days: z.array(TrainingDaySchema),
});

const TrainingSchema = z.object({
  phases: z.array(PhaseSchema),
  weeks: z.array(WeekSchema),
  generalGuidelines: z.object({
    progressionRules: z.array(z.string()),
    warmupGuidelines: z.string(),
    deloadInstructions: z.string(),
  }),
});

const MealSchema = z.object({
  name: z.string(),
  timeOfDay: z.string(),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatsG: z.number().min(0),
  ingredients: z.array(z.string()),
  instructions: z.string(),
});

const NutritionDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(90),
  dayType: z.enum(['training', 'rest']),
  calories: z.number().int().min(0),
  proteinG: z.number().min(0),
  carbsG: z.number().min(0),
  fatsG: z.number().min(0),
  meals: z.array(MealSchema),
});

const NutritionSchema = z.object({
  globalGuidelines: z.object({
    goalType: z.string(),
    calorieStrategy: z.string(),
    proteinTargetRule: z.string(),
    notes: z.string(),
  }),
  days: z.array(NutritionDaySchema),
});

const ProgramResponseSchema = z.object({
  programLengthDays: z.literal(90),
  training: TrainingSchema,
  nutrition: NutritionSchema,
});

type GeneratedProgram = z.infer<typeof ProgramResponseSchema>;

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
              content: 'You are an expert personal trainer and nutritionist. Generate comprehensive 90-day training and nutrition plans. Always respond with valid JSON only, no markdown, no explanations.',
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

      // Validate with Zod
      const validated = ProgramResponseSchema.parse(parsed);
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
  const lines: string[] = [
    `Create a comprehensive 90-day personal training and nutrition program for this client:`,
    '',
    `**Client Profile:**`,
    `- Age: ${assessment.age || 'Not specified'}`,
    `- Gender: ${assessment.gender || 'Not specified'}`,
    `- Height: ${assessment.height_cm ? `${assessment.height_cm} cm` : 'Not specified'}`,
    `- Weight: ${assessment.weight_kg ? `${assessment.weight_kg} kg` : 'Not specified'}`,
    `- Training days per week: ${assessment.weekly_days || 3}`,
    `- Available days: ${assessment.available_days?.join(', ') || 'Not specified'}`,
    `- Daily training time: ${assessment.daily_minutes ? `${assessment.daily_minutes} minutes` : '45 minutes'}`,
    `- Equipment access: ${assessment.has_equipment ? 'Yes (full gym)' : 'No (bodyweight/minimal equipment)'}`,
    `- Primary goals: ${assessment.goals?.join(', ') || 'General fitness'}`,
  ];

  if (assessment.goal_description) {
    lines.push(`- Goal description: ${assessment.goal_description}`);
  }

  lines.push(
    '',
    `**Requirements:**`,
    `1. Generate a complete 90-day program (programLengthDays: 90)`,
    `2. Training:`,
    `   - Organize into 3-4 phases with clear progression`,
    `   - Each phase should have specific weeks (e.g., weeks 1-4, 5-8, etc.)`,
    `   - For each week, create training days that match the client's weekly_days (${assessment.weekly_days || 3} days/week)`,
    `   - Each day should have dayNumber (1-90), label (e.g., "Push A", "Legs", "Rest Day"), isRestDay boolean, primaryFocus, and exercises`,
    `   - Exercises should include: name, sets, reps (number or string like "8-10"), optional rir (0-3), restSeconds, tempo, notes`,
    `   - Include rest days appropriately`,
    `   - Provide generalGuidelines with progressionRules, warmupGuidelines, deloadInstructions`,
    '',
    `3. Nutrition:`,
    `   - Provide globalGuidelines: goalType, calorieStrategy, proteinTargetRule, notes`,
    `   - For each of the 90 days, provide:`,
    `     * dayNumber (1-90), dayType ("training" or "rest"), macros (calories, proteinG, carbsG, fatsG)`,
    `     * meals array with: name, timeOfDay, calories, proteinG, carbsG, fatsG, ingredients, instructions`,
    `   - Adjust macros based on training vs rest days`,
    `   - Make meals practical and easy to prepare`,
    '',
    `**Important:**`,
    `- Match the client's training frequency (${assessment.weekly_days || 3} days/week)`,
    `- Respect equipment constraints (${assessment.has_equipment ? 'full gym' : 'bodyweight/minimal'})`,
    `- Align with their goals: ${assessment.goals?.join(', ') || 'general fitness'}`,
    `- Progressively increase difficulty over 90 days`,
    `- Make nutrition realistic and sustainable`,
    '',
    `Respond with JSON matching this exact structure:`,
    `{`,
    `  "programLengthDays": 90,`,
    `  "training": {`,
    `    "phases": [{"name": "Phase 1", "weeks": [1,2,3,4], "goal": "..."}],`,
    `    "weeks": [{"weekNumber": 1, "focus": "...", "days": [{"dayNumber": 1, "label": "...", "isRestDay": false, "primaryFocus": "...", "exercises": [...]}]}],`,
    `    "generalGuidelines": {...}`,
    `  },`,
    `  "nutrition": {`,
    `    "globalGuidelines": {...},`,
    `    "days": [{"dayNumber": 1, "dayType": "training", "calories": ..., "proteinG": ..., "carbsG": ..., "fatsG": ..., "meals": [...]}]`,
    `  }`,
    `}`,
  );

  return lines.join('\n');
}

