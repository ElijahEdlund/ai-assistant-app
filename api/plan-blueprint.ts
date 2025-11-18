import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePlanBlueprint } from '../server/functions/planBlueprint';

// Helper function to set CORS headers
function setCORSHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  setCORSHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assessment } = req.body;
    
    if (!assessment) {
      return res.status(400).json({ error: 'Assessment is required' });
    }

    console.log('Generating plan blueprint...');
    const blueprint = await generatePlanBlueprint({ assessment });
    console.log('Blueprint generated successfully');
    
    return res.status(200).json(blueprint);
  } catch (error) {
    console.error('Error generating plan blueprint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

