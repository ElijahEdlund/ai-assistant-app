import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePlanDetails } from '../planDetails';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessment, blueprint } = req.body;
    
    if (!assessment) {
      return res.status(400).json({ error: 'Assessment is required' });
    }

    if (!blueprint) {
      return res.status(400).json({ error: 'Blueprint is required' });
    }

    const details = await generatePlanDetails({ assessment, blueprint });
    return res.status(200).json(details);
  } catch (error) {
    console.error('Error generating plan details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

