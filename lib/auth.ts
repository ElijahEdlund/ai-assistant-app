import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from './supabase';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export async function checkBiometricAvailability(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return { success: false, error: 'Biometric authentication not available on this device' };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return { success: false, error: 'No biometric credentials enrolled' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your account',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Authentication failed' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

