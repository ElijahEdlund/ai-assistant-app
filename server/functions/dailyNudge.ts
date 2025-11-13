// Server function to send daily nudge notifications
// This should be deployed as a cron job (e.g., Vercel Cron, Supabase Edge Function with pg_cron)

import { generateCoachHint } from './coachHint';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// This would typically query Supabase for users with tasks today
// and send push notifications via Expo Push Notification service
export async function sendDailyNudge() {
  // TODO: Implement Supabase query to get users with tasks today
  // For each user:
  // 1. Get their tasks for today
  // 2. Generate tone-aware push message using OpenAI
  // 3. Send via Expo Push Notification API
  
  // Example structure:
  /*
  const users = await getUsersWithTasksToday();
  
  for (const user of users) {
    const tasks = await getTodayTasks(user.id);
    const hint = await generateCoachHint({
      streakDays: user.streakDays,
      onTimePercentage: user.onTimePercentage,
      completionRate: user.completionRate,
      recentCheckins: user.recentCheckins,
      tone: 'encouraging',
    });
    
    await sendExpoPushNotification(user.push_token, {
      title: "Today's Tasks",
      body: hint,
      data: { screen: 'today' },
    });
  }
  */
}

async function sendExpoPushNotification(
  pushToken: string,
  notification: { title: string; body: string; data?: any }
) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: pushToken,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send push notification: ${response.statusText}`);
  }
}

