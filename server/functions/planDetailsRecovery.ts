import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';
import { PlanBlueprint } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const RecoveryRoutineSchema = z.object({
  isRecoveryDay: z.boolean(),
  description: z.string(),
  steps: z.array(z.string()),
  extraTips: z.array(z.string()),
});

const RecoveryDetailsSchema = z.record(z.string(), z.object({
  name: z.string(),
  recoveryRoutine: RecoveryRoutineSchema,
}));

export interface PlanDetailsRecoveryRequest {
  assessment: Assessment;
  blueprint: PlanBlueprint;
  dayTypeIds: string[]; // Only generate details for these recovery day types
}

export async function generatePlanDetailsRecovery(
  request: PlanDetailsRecoveryRequest
): Promise<Record<string, any>> {
  const { assessment, blueprint, dayTypeIds } = request;
  const prompt = buildRecoveryPrompt(assessment, blueprint, dayTypeIds);

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
          max_tokens: 3000, // Recovery routines are smaller
          messages: [
            {
              role: 'system',
              content: `You are an expert strength & conditioning coach.

Generate DETAILED recovery routines for recovery day types from a program blueprint.

Return JSON with this structure:
{
  "[dayTypeId]": {
    "name": string (matches blueprint label),
    "recoveryRoutine": {
      "isRecoveryDay": true,
      "description": string (overview),
      "steps": string[] (3-5 detailed recovery blocks, each as a complete sentence),
      "extraTips": string[] (2-3 additional tips)
    }
  }
}

RECOVERY ROUTINE REQUIREMENTS:
- Each step should be a complete "block" (e.g., "Block 1 – 10-min hip mobility: 2 rounds of 30s couch stretch per side, 30s 90/90 hip switches, 30s deep squat hold")
- 3-5 such blocks per recovery day
- Tailor to user's injuries, priority areas, and activity level
- Make it actionable and specific, not vague

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

      const validated = RecoveryDetailsSchema.parse(parsed);
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid recovery details structure: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
      if (error instanceof z.ZodError) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid recovery details after retries');
}

function buildRecoveryPrompt(
  assessment: Assessment,
  blueprint: PlanBlueprint,
  dayTypeIds: string[]
): string {
  const injuries_or_pain = assessment.injuries_or_pain || 'none';
  const priority_areas = assessment.priority_areas || 'none';
  const activity_level = assessment.activity_level || 'moderately_active';

  const requestedDayTypes = blueprint.splitDesign.dayTypes.filter(dt => dayTypeIds.includes(dt.id));
  const essentialBlueprint = {
    dayTypes: requestedDayTypes.map((dt: any) => ({
      id: dt.id,
      label: dt.label,
    })),
  };

  return `User profile:
- Injuries: ${injuries_or_pain}
- Priority areas: ${priority_areas}
- Activity level: ${activity_level}

PROGRAM BLUEPRINT (generate recovery routines ONLY for these day types):
${JSON.stringify(essentialBlueprint, null, 2)}

Generate detailed recovery routines for the recovery day types listed above. Return JSON with dayTypeDetails keyed by dayTypeId.`;
}

