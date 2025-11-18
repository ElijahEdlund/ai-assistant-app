import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';
import { PlanBlueprint } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const ExerciseSchema = z.object({
  name: z.string(),
  equipment: z.string(),
  sets: z.number().int().min(1),
  reps: z.string(),
  restSeconds: z.number().int().min(30),
  tempo: z.string().optional(),
  howTo: z.string(),
  cues: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  progressionTips: z.array(z.string()),
});

const BlockSchema = z.object({
  title: z.string(),
  exercises: z.array(ExerciseSchema),
});

const WorkoutDayDetailSchema = z.object({
  name: z.string(),
  trainingFocus: z.string(),
  warmup: z.object({
    description: z.string(),
    steps: z.array(z.string()),
  }),
  blocks: z.array(BlockSchema),
  cardioProtocol: z.object({
    isIncluded: z.boolean(),
    description: z.string(),
    exampleSessions: z.array(z.string()),
  }).optional(),
});

const WorkoutDetailsSchema = z.record(z.string(), WorkoutDayDetailSchema);

export interface PlanDetailsWorkoutsRequest {
  assessment: Assessment;
  blueprint: PlanBlueprint;
  dayTypeIds: string[]; // Only generate details for these day types
}

export async function generatePlanDetailsWorkouts(
  request: PlanDetailsWorkoutsRequest
): Promise<Record<string, any>> {
  const { assessment, blueprint, dayTypeIds } = request;
  const prompt = buildWorkoutsPrompt(assessment, blueprint, dayTypeIds);

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
          max_tokens: 6000, // Reduce token limit to speed up generation
          messages: [
            {
              role: 'system',
              content: `You are an expert strength & conditioning coach.

Generate DETAILED workout content for specific day types from a program blueprint.

CRITICAL: The blueprint structure is ALREADY DECIDED. You must STRICTLY FOLLOW it.

Return JSON with this structure:
{
  "[dayTypeId]": {
    "name": string (matches blueprint label),
    "trainingFocus": string (1-2 sentences),
    "warmup": {
      "description": string,
      "steps": string[] (3-6 detailed steps)
    },
    "blocks": [
      {
        "title": string (e.g. "Main Lifts", "Accessories", "Finisher"),
        "exercises": [
          {
            "name": string,
            "equipment": string,
            "sets": number,
            "reps": string (e.g. "6-8", "8-12"),
            "restSeconds": number,
            "tempo": string (optional),
            "howTo": string (multi-step explanation, 3-6 steps),
            "cues": string[] (3-6 specific cues),
            "commonMistakes": string[] (3-5 detailed mistakes),
            "progressionTips": string[] (2-4 tips)
          }
        ]
      }
    ],
    "cardioProtocol": {
      "isIncluded": boolean,
      "description": string,
      "exampleSessions": string[]
    } (only if blueprint says includesCardio: true)
  }
}

EXERCISE REQUIREMENTS:
- howTo: Multi-step explanation (3-6 clear steps) on how to perform the exercise
- cues: 3-6 SPECIFIC, actionable cues (avoid vague ones like "engage core")
- commonMistakes: 3-5 DETAILED mistakes with WHY they're bad and WHAT to do instead
- progressionTips: 2-4 specific tips on how to add load, reps, sets, or difficulty

WORKOUT STRUCTURE:
- Create appropriate blocks: Main Lifts, Accessories, Finisher (optional)
- Exercise volume should match sessionLengthMinutes from blueprint
- Include warmup routine specific to the day's focus

Return JSON ONLY, no markdown, no backticks.`,
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

      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Invalid JSON from OpenAI: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
      }

      const validated = WorkoutDetailsSchema.parse(parsed);
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid workout details structure: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
      if (error instanceof z.ZodError) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid workout details after retries');
}

function buildWorkoutsPrompt(
  assessment: Assessment,
  blueprint: PlanBlueprint,
  dayTypeIds: string[]
): string {
  const daily_minutes = assessment.daily_minutes || 45;
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

  // Filter to only the requested day types
  const requestedDayTypes = blueprint.splitDesign.dayTypes.filter(dt => dayTypeIds.includes(dt.id));
  const essentialBlueprint = {
    dayTypes: requestedDayTypes.map((dt: any) => ({
      id: dt.id,
      label: dt.label,
      category: dt.category,
      includesCardio: dt.includesCardio,
    })),
    sessionLengthMinutes: blueprint.userProfile.sessionLengthMinutes,
  };

  return `User profile:
- Training experience: ${training_experience}
- Minutes per workout: ${daily_minutes}
- Equipment: ${equipmentDescription}
- Injuries: ${injuries_or_pain}
- Priority areas: ${priority_areas}

PROGRAM BLUEPRINT (generate details ONLY for these day types):
${JSON.stringify(essentialBlueprint, null, 2)}

Generate detailed workout content for the day types listed above. Return JSON with dayTypeDetails keyed by dayTypeId.`;
}

