import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricUnlocked, setBiometricUnlocked] = useState(false);
  const biometricDisabledRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        console.error('Error getting session:', error);
      }
      const session = data?.session ?? null;
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && !biometricDisabledRef.current) {
        checkBiometricPreference(session.user.id).catch((err) =>
          console.error('Error checking biometric preference:', err)
        );
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user && !biometricDisabledRef.current) {
        checkBiometricPreference(session.user.id).catch((err) =>
          console.error('Error checking biometric preference:', err)
        );
      } else {
        setBiometricEnabled(false);
        setBiometricUnlocked(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkBiometricPreference = async (userId: string) => {
    if (biometricDisabledRef.current) {
      setBiometricEnabled(false);
      setBiometricUnlocked(true);
      return;
    }

    const { data, error } = await supabase
      .from('user_prefs')
      .select('biometric_enabled')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        biometricDisabledRef.current = true;
      } else if (error.code !== 'PGRST116') {
        console.error('Error fetching biometric preference:', error);
      }
      setBiometricEnabled(false);
      setBiometricUnlocked(true);
      return;
    }

    if (data?.biometric_enabled) {
      setBiometricEnabled(true);
      const result = await authenticateWithBiometrics();
      setBiometricUnlocked(result.success);
    } else {
      setBiometricEnabled(false);
      setBiometricUnlocked(true);
    }
  };

  const requireBiometric = async (): Promise<boolean> => {
    if (!biometricEnabled) return true;
    const result = await authenticateWithBiometrics();
    setBiometricUnlocked(result.success);
    return result.success;
  };

  return {
    user,
    loading,
    biometricEnabled,
    biometricUnlocked,
    requireBiometric,
  };
}

