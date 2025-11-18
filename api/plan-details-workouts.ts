import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePlanDetailsWorkouts } from '../server/functions/planDetailsWorkouts';

function setCORSHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessment, blueprint, dayTypeIds } = req.body;
    
    if (!assessment || !blueprint || !dayTypeIds) {
      return res.status(400).json({ error: 'Assessment, blueprint, and dayTypeIds are required' });
    }

    console.log('Generating workout details for day types:', dayTypeIds);
    const details = await generatePlanDetailsWorkouts({ assessment, blueprint, dayTypeIds });
    console.log('Workout details generated successfully');
    
    return res.status(200).json(details);
  } catch (error) {
    console.error('Error generating workout details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

