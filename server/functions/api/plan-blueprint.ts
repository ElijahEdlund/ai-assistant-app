import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePlanBlueprint } from '../planBlueprint';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessment } = req.body;
    
    if (!assessment) {
      return res.status(400).json({ error: 'Assessment is required' });
    }

    const blueprint = await generatePlanBlueprint({ assessment });
    return res.status(200).json(blueprint);
  } catch (error) {
    console.error('Error generating plan blueprint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

