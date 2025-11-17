import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generate90DayPlan } from '../generate90DayPlan';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessment } = req.body;
    
    if (!assessment) {
      return res.status(400).json({ error: 'Assessment is required' });
    }

    const plan = await generate90DayPlan({ assessment });
    console.log(JSON.stringify(plan, null, 2));
    return res.status(200).json(plan);
  } catch (error) {
    console.error('Error generating 90-day plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}