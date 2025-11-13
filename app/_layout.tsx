import 'react-native-gesture-handler';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider, Theme } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import tamaguiConfig from '../tamagui.config';
import { useAuth } from '../lib/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { resetAll } from '../lib/data/dataClient';
import { useSubscriptionStore } from '../lib/state/subscription';
import { useAssessmentStore } from '../lib/state/assessment';
import { useProgramStore } from '../lib/state/program';
import { SwipeBackProvider, SwipeBackContainer } from '../lib/gestures/swipeBack';
import { useThemeStore } from '../lib/state/theme';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
import { PortalProvider } from '@tamagui/portal';

const RootLayoutInner = () => {
  const { user, loading, biometricUnlocked } = useAuth();
  const themeStore = useThemeStore();
  const theme = themeStore.theme;
  const segments = useSegments();
  const router = useRouter();
  const flowTriggered = useRef(false);

  useEffect(() => {
    if (loading) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === '(auth)';
    const inOnboardingGroup = currentSegment === 'onboarding';
    const inProgramGroup = currentSegment === 'program';
    const inStandaloneAllowed = currentSegment === 'settings';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      if (biometricUnlocked) {
        startNewFlow();
      }
    } else if (user && biometricUnlocked && !(inOnboardingGroup || inProgramGroup || inStandaloneAllowed)) {
      startNewFlow();
    }
  }, [user, loading, segments, biometricUnlocked]);

  const startNewFlow = async () => {
    if (flowTriggered.current || !user) return;
    flowTriggered.current = true;

    try {
      await resetAll();
      useSubscriptionStore.setState({ subscription: null });
      useAssessmentStore.setState({ assessment: null });
      useProgramStore.setState({ plan: null });
    } catch (error) {
      console.error('Error resetting onboarding state:', error);
    }
    setTimeout(() => {
      router.replace('/onboarding/paywall');
    }, 0);
  };

  const backgroundColor = theme === 'dark' ? '#000000' : '#ffffff';
  const indicatorColor = theme === 'dark' ? '#ffffff' : '#333333';

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GlobalErrorBoundary theme={theme}>
          <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
            <PortalProvider shouldAddRootHost rootHostName="root">
              <Theme name={theme}>
                <SafeAreaProvider>
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor,
                    }}
                  >
                    <ActivityIndicator size="large" color={indicatorColor} />
                  </View>
                </SafeAreaProvider>
              </Theme>
            </PortalProvider>
          </TamaguiProvider>
        </GlobalErrorBoundary>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GlobalErrorBoundary theme={theme}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
          <PortalProvider shouldAddRootHost rootHostName="root">
            <Theme name={theme}>
              <SafeAreaProvider>
                <SwipeBackProvider>
                  <SwipeBackContainer>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor },
                        gestureEnabled: true,
                      }}
                    />
                  </SwipeBackContainer>
                </SwipeBackProvider>
              </SafeAreaProvider>
            </Theme>
          </PortalProvider>
        </TamaguiProvider>
      </GlobalErrorBoundary>
    </GestureHandlerRootView>
  );
};

export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <RootLayoutInner />
    </GlobalErrorBoundary>
  );
}
