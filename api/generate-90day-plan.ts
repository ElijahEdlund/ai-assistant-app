import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generate90DayPlan } from '../server/functions/generate90DayPlan';

// Helper function to set CORS headers
function setCORSHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  setCORSHeaders(res);

  // Log request for debugging
  console.log('API Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check method after CORS headers are set
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method, 'Expected: POST');
    return res.status(405).json({ 
      error: 'Method not allowed',
      received: req.method,
      expected: 'POST',
    });
  }

  // Set a timeout handler (55 seconds to stay under 60s Vercel limit)
  const timeout = 55000;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
  });

  try {
    const { assessment } = req.body;
    
    if (!assessment) {
      if (timeoutId) clearTimeout(timeoutId);
      console.log('Missing assessment in request body');
      return res.status(400).json({ error: 'Assessment is required' });
    }

    console.log('Generating 90-day plan for assessment...');
    const startTime = Date.now();
    
    // Race between the actual generation and timeout
    const generatedProgram = await Promise.race([
      generate90DayPlan({ assessment }),
      timeoutPromise,
    ]) as any;
    
    if (timeoutId) clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    console.log(`Plan generation completed in ${duration}ms`);
    
    // Log summary information (removed full JSON dump to reduce log size)
    console.log('Plan Summary:');
    console.log('- Template Days:', generatedProgram.training?.length || 0);
    console.log('- Workout Days:', generatedProgram.training?.filter((d: any) => d.isWorkoutDay).length || 0);
    console.log('- Rest Days:', generatedProgram.training?.filter((d: any) => !d.isWorkoutDay).length || 0);
    console.log('- Total Exercises:', generatedProgram.training?.reduce((sum: number, d: any) => 
      sum + (d.workout?.exercises?.length || 0), 0) || 0);
    console.log('- Nutrition Targets:', generatedProgram.nutrition?.dailyMacroTargets ? 'Set' : 'Not set');
    
    console.log('90-day plan generated successfully');
    return res.status(200).json(generatedProgram);
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.error('Error generating 90-day plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Check if it's a timeout error
    if (errorMessage.includes('timeout') || errorMessage.includes('Request timeout')) {
      return res.status(504).json({ 
        error: 'Request timeout - The plan generation is taking longer than expected. Please try again.',
        timeout: true
      });
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
