import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';
import { PlanBlueprint, PlanBlueprintRequest } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const PlanBlueprintSchema = z.object({
  userProfile: z.object({
    goal: z.string(),
    trainingDaysPerWeek: z.number().int().min(2).max(6),
    sessionLengthMinutes: z.number().int().min(15),
    cardioPreference: z.string().optional(),
    equipmentAccess: z.string().optional(),
    injuries: z.array(z.string()).optional(),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    bodyGoals: z.array(z.string()).optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    height_cm: z.number().optional(),
    weight_kg: z.number().optional(),
    activityLevel: z.string().optional(),
    priorityAreas: z.string().optional(),
  }),
  programOverview: z.object({
    title: z.string(),
    primaryGoal: z.string(),
    secondaryGoals: z.array(z.string()),
    summary: z.string().max(500), // Keep it short
  }),
  splitDesign: z.object({
    microcycleLengthDays: z.number().int().min(7).max(14),
    dayTypes: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        category: z.enum(['strength', 'hypertrophy', 'conditioning', 'recovery']),
        focusDescription: z.string().max(200), // Short description
        includesCardio: z.boolean(),
        isRecoveryDay: z.boolean(),
      })
    ),
    microcycleTemplate: z.array(
      z.object({
        dayIndex: z.number().int().min(1),
        dayTypeId: z.string(),
      })
    ),
    programLengthDays: z.number().int().equal(90),
  }),
  nutritionOverview: z.object({
    dailyMacros: z.object({
      calories: z.number().int().min(0),
      proteinGrams: z.number().min(0),
      carbsGrams: z.number().min(0),
      fatsGrams: z.number().min(0),
    }),
    sampleMeals: z.array(
      z.object({
        name: z.string(),
        description: z.string().max(100),
      })
    ).max(5), // Keep it small
    guidelines: z.array(z.string().max(150)).max(8), // Short bullets
  }),
});

export async function generatePlanBlueprint(request: PlanBlueprintRequest): Promise<PlanBlueprint> {
  const { assessment } = request;
  const prompt = buildBlueprintPrompt(assessment);

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
              content: `You are an expert strength & conditioning coach.

Your job:
Design a COMPACT structural blueprint for a 90-day training program based on a 2-week (14-day) microcycle that repeats.

CRITICAL: Return ONLY the structural blueprint in JSON format. NO long-form coaching content, NO detailed exercise descriptions, NO essays. Keep all text fields SHORT and STRUCTURAL.

JSON STRUCTURE REQUIRED:
{
  "userProfile": {
    "goal": string,
    "trainingDaysPerWeek": number,
    "sessionLengthMinutes": number,
    "cardioPreference": string (optional),
    "equipmentAccess": string,
    "injuries": string[] (optional),
    "experienceLevel": "beginner" | "intermediate" | "advanced",
    "bodyGoals": string[] (optional),
    "age": number (optional),
    "gender": "male" | "female" | "other" (optional),
    "height_cm": number (optional),
    "weight_kg": number (optional),
    "activityLevel": string (optional),
    "priorityAreas": string (optional)
  },
  "programOverview": {
    "title": string (short, e.g. "Lean Strength Builder"),
    "primaryGoal": string (one sentence),
    "secondaryGoals": string[] (2-3 short goals),
    "summary": string (2-4 sentences MAX, no essays)
  },
  "splitDesign": {
    "microcycleLengthDays": 14,
    "dayTypes": [
      {
        "id": string (e.g. "upper_a", "lower_a", "cardio_a", "recovery_a"),
        "label": string (e.g. "Upper Strength A"),
        "category": "strength" | "hypertrophy" | "conditioning" | "recovery",
        "focusDescription": string (1-2 sentences MAX),
        "includesCardio": boolean,
        "isRecoveryDay": boolean
      }
    ],
    "microcycleTemplate": [
      {
        "dayIndex": number (1-14),
        "dayTypeId": string (references dayTypes.id)
      }
    ],
    "programLengthDays": 90
  },
  "nutritionOverview": {
    "dailyMacros": {
      "calories": number,
      "proteinGrams": number,
      "carbsGrams": number,
      "fatsGrams": number
    },
    "sampleMeals": [
      {
        "name": string,
        "description": string (one sentence MAX)
      }
    ] (max 5 meals),
    "guidelines": string[] (short bullets, max 8, each max 150 chars)
  }
}

RULES:
- Keep ALL text fields SHORT. No essays, no long paragraphs.
- programOverview.summary: 2-4 sentences only.
- dayTypes[].focusDescription: 1-2 sentences only.
- nutritionOverview.guidelines: Short bullets, not paragraphs.
- Design a 2-week (14-day) microcycle that repeats over 90 days.
- Include appropriate day types based on goal:
  - Strength days for strength goals
  - Hypertrophy days for muscle gain
  - Conditioning days if goal includes "get lean" or fat loss
  - Recovery days (at least 1-2 per 14 days)
- For "get lean" goals, ensure conditioning/cardio is integrated (1-3 sessions per week).
- Map the 14-day template to the user's trainingDaysPerWeek (distribute workout days appropriately).
- Calculate macros based on age, weight, height, gender, activityLevel, and goal.
- Return JSON ONLY, no markdown, no backticks.`,
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
      
      let parsed;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Content preview (last 500 chars):', jsonContent.slice(-500));
        throw new Error(`Invalid JSON from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      // Validate with Zod
      const validated = PlanBlueprintSchema.parse(parsed);
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid blueprint structure from AI: ${JSON.stringify(error.errors)}`);
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

  throw new Error('Failed to generate valid blueprint after retries');
}

function buildBlueprintPrompt(assessment: Assessment): string {
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
  
  // Determine equipment description
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
    `User profile for training program blueprint:`,
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
    `Generate a COMPACT structural blueprint only. Return the JSON object matching the required structure.`,
  );

  return lines.join('\n');
}

