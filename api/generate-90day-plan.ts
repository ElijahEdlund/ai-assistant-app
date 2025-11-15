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

  try {
    const { assessment } = req.body;
    
    if (!assessment) {
      console.log('Missing assessment in request body');
      return res.status(400).json({ error: 'Assessment is required' });
    }

    console.log('Generating 90-day plan for assessment...');
    const plan = await generate90DayPlan({ assessment });
    
    // Print the entire plan in a readable format
    console.log('\n========== FULL 90-DAY PLAN ==========');
    console.log(JSON.stringify(plan, null, 2));
    console.log('========== END OF PLAN ==========\n');
    
    // Also log summary information
    console.log('Plan Summary:');
    console.log('- Program Length:', plan.programLengthDays, 'days');
    console.log('- Training Phases:', plan.training?.phases?.length || 0);
    console.log('- Training Weeks:', plan.training?.weeks?.length || 0);
    console.log('- Nutrition Days:', plan.nutrition?.days?.length || 0);
    console.log('- Total Workouts:', plan.training?.weeks?.reduce((acc: number, week: any) => 
      acc + (week.days?.filter((d: any) => !d.isRestDay).length || 0), 0) || 0);
    
    console.log('90-day plan generated successfully');
    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error generating 90-day plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }

}

