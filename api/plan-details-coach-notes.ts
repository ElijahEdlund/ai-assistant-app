import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generatePlanDetailsCoachNotes } from '../server/functions/planDetailsCoachNotes';

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
    const { assessment, blueprint } = req.body;
    
    if (!assessment || !blueprint) {
      return res.status(400).json({ error: 'Assessment and blueprint are required' });
    }

    console.log('Generating coach notes...');
    const notes = await generatePlanDetailsCoachNotes({ assessment, blueprint });
    console.log('Coach notes generated successfully');
    
    return res.status(200).json(notes);
  } catch (error) {
    console.error('Error generating coach notes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}

