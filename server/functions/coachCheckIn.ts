const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

export interface CoachCheckInRequest {
  userMessage: string;
  type: 'pre' | 'post';
  context?: {
    dayNumber?: number;
    workoutName?: string;
  };
}

export async function generateCoachCheckInResponse(request: CoachCheckInRequest): Promise<string> {
  const prompt = buildCheckInPrompt(request);

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
            content: 'You are a supportive, encouraging personal trainer. Provide brief, actionable coaching responses (1-2 sentences). Be warm and motivating.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || getFallbackResponse(request.type);
  } catch (error) {
    console.error('Error generating coach check-in response:', error);
    return getFallbackResponse(request.type);
  }
}

function buildCheckInPrompt(request: CoachCheckInRequest): string {
  const { userMessage, type, context } = request;
  
  const lines: string[] = [];
  
  if (type === 'pre') {
    lines.push('The user is about to start their workout and shared this:');
  } else {
    lines.push('The user just finished their workout and shared this:');
  }
  
  lines.push(`"${userMessage}"`);
  
  if (context?.dayNumber) {
    lines.push(`This is day ${context.dayNumber} of their 90-day program.`);
  }
  
  if (context?.workoutName) {
    lines.push(`Workout: ${context.workoutName}`);
  }
  
  lines.push('');
  lines.push(type === 'pre' 
    ? 'Provide a brief, encouraging pre-workout message (1-2 sentences) to motivate them and give one helpful tip.'
    : 'Provide a brief, supportive post-workout message (1-2 sentences) acknowledging their effort and giving one recovery tip.'
  );

  return lines.join('\n');
}

function getFallbackResponse(type: 'pre' | 'post'): string {
  if (type === 'pre') {
    return 'Great! Stay focused and give it your best effort today. Remember to warm up properly and listen to your body.';
  }
  return 'Well done! Recovery is just as important as training. Make sure to hydrate and get some rest.';
}

