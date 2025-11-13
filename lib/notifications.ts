import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, userPrefs } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    token = data;

    if (token) {
      // Store token in user_prefs
      await userPrefs.update(userId, { push_token: token });
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

export async function scheduleLocalNotification(
  identifier: string,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
    },
    trigger,
  });
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

