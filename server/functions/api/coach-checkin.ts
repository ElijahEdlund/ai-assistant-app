import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateCoachCheckInResponse } from '../coachCheckIn';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMessage, type, context } = req.body;
    
    if (!userMessage || !type) {
      return res.status(400).json({ error: 'userMessage and type are required' });
    }

    const response = await generateCoachCheckInResponse({
      userMessage,
      type,
      context,
    });
    
    return res.status(200).json({ response });
  } catch (error) {
    console.error('Error generating check-in response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
}