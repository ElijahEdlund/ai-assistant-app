import { z } from 'zod';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

const PlanResponseSchema = z.object({
  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      day_index: z.number().int().nonnegative(),
    })
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      day_index: z.number().int().nonnegative(),
      duration_min: z.number().int().positive(),
      preferred_window: z.string(), // e.g., "09:00-12:00"
    })
  ),
});

export interface GeneratePlanRequest {
  goalTitle: string;
  goalDescription?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  timeframeWeeks: number;
  dailyMinutes: number;
  preferredWindows: string[];
  constraints?: string;
}

export async function generatePlan(request: GeneratePlanRequest) {
  const prompt = buildPrompt(request);
  
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that generates structured learning/workout plans. Always respond with valid JSON only, no markdown, no explanations.',
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
      const validated = PlanResponseSchema.parse(parsed);
      
      return validated;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        if (error instanceof z.ZodError) {
          return { status: 422, error: 'Invalid plan structure from AI', details: error.errors };
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

function buildPrompt(request: GeneratePlanRequest): string {
  return `Generate a structured plan for the following goal:

Goal: ${request.goalTitle}
${request.goalDescription ? `Description: ${request.goalDescription}` : ''}
Level: ${request.level}
Timeframe: ${request.timeframeWeeks} weeks
Daily commitment: ${request.dailyMinutes} minutes
Preferred time windows: ${request.preferredWindows.join(', ')}
${request.constraints ? `Constraints: ${request.constraints}` : ''}

Generate a plan with:
1. Milestones: 3-5 major milestones spread across the ${request.timeframeWeeks} weeks
2. Tasks: Daily tasks that fit within ${request.dailyMinutes} minutes, distributed across the timeframe

Requirements:
- Each milestone should have a day_index (0 = start, ${request.timeframeWeeks * 7 - 1} = end)
- Each task should have a day_index, duration_min (${request.dailyMinutes} or less), and preferred_window (one of: ${request.preferredWindows.join(', ')})
- Tasks should be progressive and build on each other
- Distribute tasks evenly across available days
- Consider the user's level (${request.level})

Respond with JSON in this exact format:
{
  "milestones": [
    {
      "title": "Milestone title",
      "description": "Milestone description",
      "day_index": 0
    }
  ],
  "tasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "day_index": 0,
      "duration_min": ${request.dailyMinutes},
      "preferred_window": "${request.preferredWindows[0]}"
    }
  ]
}`;
}

