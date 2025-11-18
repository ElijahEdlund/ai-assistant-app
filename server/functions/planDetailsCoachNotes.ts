import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';
import { PlanBlueprint } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const CoachNotesSchema = z.object({
  howThisProgramWorks: z.string(),
  phaseBreakdown: z.array(
    z.object({
      phaseName: z.string(),
      weeks: z.string(),
      focus: z.string(),
      notes: z.string(),
    })
  ),
  howToProgress: z.string(),
  recoveryPhilosophy: z.string(),
  cardioAndConditioningApproach: z.string(),
  nutritionStrategy: z.string(),
});

export interface PlanDetailsCoachNotesRequest {
  assessment: Assessment;
  blueprint: PlanBlueprint;
}

export async function generatePlanDetailsCoachNotes(
  request: PlanDetailsCoachNotesRequest
): Promise<any> {
  const { assessment, blueprint } = request;
  const prompt = buildCoachNotesPrompt(assessment, blueprint);

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
          max_tokens: 4000, // Coach notes are substantial but focused
          messages: [
            {
              role: 'system',
              content: `You are an expert strength & conditioning coach and sports nutritionist.

Generate comprehensive coach-style notes and guidance for a 90-day training program.

Return JSON with this structure:
{
  "howThisProgramWorks": string (2-4 paragraphs explaining the program philosophy),
  "phaseBreakdown": [
    {
      "phaseName": string (e.g. "Foundation Phase"),
      "weeks": string (e.g. "Weeks 1-4"),
      "focus": string (one sentence),
      "notes": string (2-3 sentences)
    }
  ] (typically 3 phases for 90 days),
  "howToProgress": string (2-3 paragraphs on progression strategy),
  "recoveryPhilosophy": string (1-2 paragraphs),
  "cardioAndConditioningApproach": string (1-2 paragraphs),
  "nutritionStrategy": string (2-3 paragraphs expanding on blueprint nutrition)
}

COACH NOTES REQUIREMENTS:
- Write in a coach-like, personalized tone
- Reference the user's specific goals, experience, equipment, and injuries
- Provide actionable guidance, not generic advice
- Make it feel like it was written specifically for this user
- Be detailed and comprehensive

NUTRITION STRATEGY:
- Expand on the blueprint's nutrition overview
- Explain WHY the macros were chosen
- Provide meal timing guidance
- Include practical tips for hitting targets

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

      const validated = CoachNotesSchema.parse(parsed);
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid coach notes structure: ${JSON.stringify(error.errors)}`);
        }
        throw error;
      }
      if (error instanceof z.ZodError) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid coach notes after retries');
}

function buildCoachNotesPrompt(assessment: Assessment, blueprint: PlanBlueprint): string {
  const age = assessment.age || 30;
  const weight_kg = assessment.weight_kg || 70;
  const height_cm = assessment.height_cm || 170;
  const gender = assessment.gender || 'male';
  const training_experience = assessment.training_experience || 'intermediate';
  const injuries_or_pain = assessment.injuries_or_pain || 'none';
  const priority_areas = assessment.priority_areas || 'none';
  const activity_level = assessment.activity_level || 'moderately_active';

  return `User profile:
- Age: ${age}, Sex: ${gender}
- Height: ${height_cm} cm, Weight: ${weight_kg} kg
- Goal: ${assessment.goals?.join(', ') || 'General fitness'}
- Training experience: ${training_experience}
- Injuries: ${injuries_or_pain}
- Priority areas: ${priority_areas}
- Activity level: ${activity_level}

PROGRAM BLUEPRINT:
${JSON.stringify({
  programOverview: blueprint.programOverview,
  splitDesign: {
    dayTypes: blueprint.splitDesign.dayTypes.map((dt: any) => ({
      id: dt.id,
      label: dt.label,
      category: dt.category,
    })),
  },
  nutritionOverview: blueprint.nutritionOverview,
}, null, 2)}

Generate comprehensive coach notes and guidance based on this blueprint and user profile.`;
}

