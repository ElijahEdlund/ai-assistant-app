// Supabase Edge Function: Generate Workout Plan
// Deploy: supabase functions deploy generate_plan

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o';

interface Assessment {
  goals: string[];
  weekly_days: number;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: string;
}

serve(async (req) => {
  try {
    const { user_id, assessment } = await req.json();

    if (!user_id || !assessment) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or assessment' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate plan with OpenAI (or fallback to mock)
    let planJson;
    if (OPENAI_API_KEY) {
      try {
        const prompt = `Generate a 12-week personalized workout plan based on:
- Goals: ${assessment.goals.join(', ')}
- Weekly training days: ${assessment.weekly_days}
- Age: ${assessment.age || 'N/A'}
- Gender: ${assessment.gender || 'N/A'}
- Height: ${assessment.height_cm ? `${assessment.height_cm}cm` : 'N/A'}
- Weight: ${assessment.weight_kg ? `${assessment.weight_kg}kg` : 'N/A'}

Return a JSON object with:
{
  "weeks": 12,
  "startDate": "YYYY-MM-DD",
  "workouts": [
    {
      "week": 1,
      "day": 1,
      "name": "Workout Name",
      "exercises": [
        {"name": "Exercise", "sets": 3, "reps": 10, "rest": "60s"}
      ],
      "scheduledDate": "YYYY-MM-DD"
    }
  ],
  "goals": [...],
  "weeklyDays": ${assessment.weekly_days}
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        planJson = JSON.parse(content);
      } catch (error) {
        console.error('OpenAI error:', error);
        // Fallback to mock plan
        planJson = generateMockPlan(assessment);
      }
    } else {
      planJson = generateMockPlan(assessment);
    }

    // Save to database
    const { error: dbError } = await supabase
      .from('workout_plans')
      .upsert({
        user_id,
        plan: planJson,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({ success: true, plan: planJson }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateMockPlan(assessment: Assessment): any {
  const weeks = 12;
  const weeklyDays = assessment.weekly_days || 3;
  const workouts: any[] = [];
  
  const workoutNames = [
    'Upper Body Strength',
    'Lower Body Power',
    'Full Body Conditioning',
    'Core & Stability',
    'Cardio & Endurance',
    'Flexibility & Recovery',
  ];

  let dayOffset = 0;
  for (let week = 1; week <= weeks; week++) {
    for (let day = 0; day < weeklyDays; day++) {
      const workoutIndex = day % workoutNames.length;
      const workoutDay = dayOffset + day;
      
      workouts.push({
        week,
        day: workoutDay + 1,
        name: workoutNames[workoutIndex],
        exercises: [
          { name: 'Exercise 1', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 2', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 3', sets: 3, reps: 10, rest: '60s' },
          { name: 'Exercise 4', sets: 3, reps: 10, rest: '60s' },
        ],
        scheduledDate: new Date(Date.now() + workoutDay * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
    dayOffset += 7;
  }

  return {
    weeks,
    startDate: new Date().toISOString().split('T')[0],
    workouts,
    goals: assessment.goals,
    weeklyDays: assessment.weekly_days,
  };
}

