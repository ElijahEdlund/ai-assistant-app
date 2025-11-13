// Server function to generate coach hints using OpenAI
// This should be deployed as an API endpoint

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

export interface CoachHintRequest {
  streakDays: number;
  onTimePercentage: number;
  completionRate: number;
  recentCheckins: number; // Last 7 days
  tone: 'encouraging' | 'motivational' | 'analytical';
}

export async function generateCoachHint(request: CoachHintRequest): Promise<string> {
  const prompt = buildCoachPrompt(request);

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
            content: 'You are a supportive coach. Provide exactly one sentence of feedback. Be concise and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || 'Keep up the great work!';
  } catch (error) {
    console.error('Error generating coach hint:', error);
    // Fallback hints
    if (request.streakDays >= 7) {
      return 'You\'re on fire! Keep this momentum going.';
    } else if (request.completionRate >= 80) {
      return 'Great progress! You\'re staying consistent.';
    } else if (request.completionRate < 50) {
      return 'Try to focus on completing at least one task per day to build momentum.';
    }
    return 'Every step forward counts. Keep going!';
  }
}

function buildCoachPrompt(request: CoachHintRequest): string {
  const toneDescriptions = {
    encouraging: 'warm and supportive',
    motivational: 'energetic and inspiring',
    analytical: 'fact-based and constructive',
  };

  return `Generate a ${toneDescriptions[request.tone]} one-sentence coach hint based on:

- Current streak: ${request.streakDays} days
- On-time completion rate: ${request.onTimePercentage.toFixed(0)}%
- Weekly completion rate: ${request.completionRate.toFixed(0)}%
- Recent activity: ${request.recentCheckins} tasks completed in last 7 days

Provide exactly one sentence that is actionable and ${toneDescriptions[request.tone]}.`;
}

