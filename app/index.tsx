import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding/paywall');
  }, [router]);

  return null;
}

