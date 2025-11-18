import { z } from 'zod';
import { Assessment } from '../../lib/data/dataClient';
import { PlanBlueprint, PlanDetails, PlanDetailsRequest } from './types';

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
  howTo: z.string(), // Multi-step explanation
  cues: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  progressionTips: z.array(z.string()),
});

const BlockSchema = z.object({
  title: z.string(),
  exercises: z.array(ExerciseSchema),
});

const DayTypeDetailSchema = z.object({
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
  recoveryRoutine: z.object({
    isRecoveryDay: z.boolean(),
    description: z.string(),
    steps: z.array(z.string()),
    extraTips: z.array(z.string()),
  }).optional(),
});

const PlanDetailsSchema = z.object({
  dayTypeDetails: z.record(z.string(), DayTypeDetailSchema),
  globalCoachNotes: z.object({
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
  }),
});

export async function generatePlanDetails(request: PlanDetailsRequest): Promise<PlanDetails> {
  const { assessment, blueprint } = request;
  const prompt = buildDetailsPrompt(assessment, blueprint);

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
          max_tokens: 12000, // Allow enough tokens for detailed content
          messages: [
            {
              role: 'system',
              content: `You are an expert strength & conditioning coach and sports nutritionist.

Your job:
Generate DETAILED, in-depth workout content, coaching notes, and recovery routines based on a pre-designed program blueprint.

CRITICAL: The blueprint structure is ALREADY DECIDED. You must STRICTLY FOLLOW it. Do NOT change:
- Day type IDs or labels
- The microcycle template structure
- Day type categories
- The overall program design

Your role is to FILL IN all the detailed content:
- Specific exercises with sets, reps, rest periods
- In-depth exercise tutorials (cues, common mistakes, progression tips)
- Warmup routines
- Cardio/conditioning protocols
- Detailed recovery routines for recovery days
- Coach-style explanations and phase breakdowns
- Nutrition strategy details

JSON STRUCTURE REQUIRED:
{
  "dayTypeDetails": {
    "[dayTypeId]": {
      "name": string (matches blueprint label),
      "trainingFocus": string (1-2 sentences explaining the focus),
      "warmup": {
        "description": string (brief overview),
        "steps": string[] (detailed warmup steps, 3-6 steps)
      },
      "blocks": [
        {
          "title": string (e.g. "Main Lifts", "Accessories", "Finisher", "Conditioning"),
          "exercises": [
            {
              "name": string,
              "equipment": string,
              "sets": number,
              "reps": string (e.g. "6-8", "8-12", "10-15"),
              "restSeconds": number,
              "tempo": string (optional, e.g. "2-0-1-0"),
              "howTo": string (multi-step, in-depth explanation, 3-6 clear steps),
              "cues": string[] (3-6 specific, detailed cues),
              "commonMistakes": string[] (3-5 detailed mistakes with explanations),
              "progressionTips": string[] (2-4 tips on how to progress)
            }
          ]
        }
      ],
      "cardioProtocol": {
        "isIncluded": boolean,
        "description": string (detailed explanation),
        "exampleSessions": string[] (2-3 example sessions)
      } (only if blueprint says includesCardio: true),
      "recoveryRoutine": {
        "isRecoveryDay": true,
        "description": string (overview),
        "steps": string[] (3-5 detailed recovery blocks, each as a full sentence),
        "extraTips": string[] (2-3 additional tips)
      } (only for recovery day types)
    }
  },
  "globalCoachNotes": {
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
}

DETAILED CONTENT REQUIREMENTS:

EXERCISE TUTORIALS (cues, mistakes, progression):
- cues: Provide 3-6 SPECIFIC, actionable cues. Avoid vague ones like "engage core". Examples:
  - "Imagine you are bending the bar to engage your lats"
  - "Keep your ribs stacked over your pelvis to avoid hyperextending your lower back"
  - "Drive through your heels while maintaining a slight forward lean"
- commonMistakes: List 3-5 DETAILED mistakes with WHY they're bad and WHAT to do instead.
- progressionTips: 2-4 specific tips on how to add load, reps, sets, or difficulty over time.

WARMUP:
- Provide a detailed warmup routine (3-6 steps) specific to the day's focus.
- Include mobility, activation, and movement prep.

WORKOUT STRUCTURE:
- For each day type, create appropriate blocks:
  - Strength days: Main Lifts, Accessories, Finisher (optional)
  - Hypertrophy days: Main Lifts, Accessories, Pump Finisher
  - Conditioning days: Warmup, Conditioning Block(s), Cooldown
- Exercise volume should match the blueprint's sessionLengthMinutes:
  - 60+ minutes: 5-7 exercises
  - 45-59 minutes: 4-6 exercises
  - 30-44 minutes: 3-5 exercises

CARDIO/CONDITIONING:
- If blueprint indicates cardio is included, provide detailed protocols:
  - Specific intervals, durations, intensities
  - Example sessions that are actionable
  - How it integrates with the day's training

RECOVERY ROUTINES:
- For recovery day types, create detailed, actionable routines:
  - Each step should be a complete "block" (e.g., "Block 1 – 10-min hip mobility: 2 rounds of 30s couch stretch per side, 30s 90/90 hip switches, 30s deep squat hold")
  - 3-5 such blocks per recovery day
  - Tailor to user's injuries, priority areas, and activity level

COACH NOTES:
- Write in a coach-like, personalized tone
- Reference the user's specific goals, experience, equipment, and injuries
- Provide actionable guidance, not generic advice
- Make it feel like it was written specifically for this user

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
      const validated = PlanDetailsSchema.parse(parsed);
      return validated as PlanDetails;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          console.error('Validation error:', error.errors);
          throw new Error(`Invalid details structure from AI: ${JSON.stringify(error.errors)}`);
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

  throw new Error('Failed to generate valid plan details after retries');
}

function buildDetailsPrompt(assessment: Assessment, blueprint: PlanBlueprint): string {
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
    `User profile:`,
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

  // Include only essential blueprint structure to reduce prompt size
  const essentialBlueprint = {
    splitDesign: {
      dayTypes: blueprint.splitDesign.dayTypes.map((dt: any) => ({
        id: dt.id,
        label: dt.label,
        category: dt.category,
        isRecoveryDay: dt.isRecoveryDay,
        includesCardio: dt.includesCardio,
      })),
      microcycleTemplate: blueprint.splitDesign.microcycleTemplate,
    },
    userProfile: {
      goal: blueprint.userProfile.goal,
      trainingDaysPerWeek: blueprint.userProfile.trainingDaysPerWeek,
      sessionLengthMinutes: blueprint.userProfile.sessionLengthMinutes,
      equipmentAccess: blueprint.userProfile.equipmentAccess,
      injuries: blueprint.userProfile.injuries,
      experienceLevel: blueprint.userProfile.experienceLevel,
    },
  };

  lines.push(
    '',
    `PROGRAM BLUEPRINT (YOU MUST FOLLOW THIS STRUCTURE):`,
    '',
    JSON.stringify(essentialBlueprint, null, 2),
    '',
    `Generate detailed workout content, exercise tutorials, recovery routines, and coach notes based on this blueprint.`,
    `Ensure all dayTypeDetails keys match the dayType IDs from the blueprint.`,
    `Return the complete PlanDetails JSON structure.`,
  );

  return lines.join('\n');
}

