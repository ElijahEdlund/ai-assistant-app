import { View, YStack, Text } from 'tamagui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAssessmentStore } from '../../lib/state/assessment';
import { useProgramStore } from '../../lib/state/program';
import { hasSupabase } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';
import { Animated, Easing } from 'react-native';
import { useDisableSwipeBack } from '../../lib/gestures/swipeBack';
import { generate90DayPlan } from '../../lib/ai';
import { AthletIQLogo } from '../../components/AthletIQLogo';

const loadingMessages = [
  'Analyzing your goals...',
  'Designing your 90-day program...',
  'Setting macro targets...',
  'Creating personalized workouts...',
  'Building nutrition plan...',
  'Finalizing your plan...',
];

const statusMessages = [
  'Generating 90-day plan • 25%',
  'Creating training phases • 50%',
  'Calculating nutrition • 75%',
  'Finalizing program • 95%',
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const router = useRouter();
  const { assessment } = useAssessmentStore();
  const { save, generateMockPlan } = useProgramStore();
  const { user } = useAuth();
  const progress = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useDisableSwipeBack();

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length);
    }, 900);

    return () => clearInterval(interval);
  }, []);

  const runProgressAnimation = useCallback(() => {
    progress.setValue(0);
    ripple.setValue(0);

    return new Promise<void>((resolve) => {
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 5000, // Longer duration for AI generation
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(ripple, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start(() => {
        resolve();
      });
    });
  }, [progress, ripple]);

  useEffect(() => {
    if (!assessment || !user) {
      return;
    }

    let isCancelled = false;

    const generatePlanData = async () => {
      // Ensure assessment has user_id
      const assessmentWithUserId = {
        ...assessment,
        user_id: assessment?.user_id || user.id,
      };

      if (!assessmentWithUserId.user_id) {
        throw new Error('Assessment is missing user_id and user is not available');
      }

      // Try to generate 90-day AI plan first
      try {
        console.log('Attempting to generate 90-day AI plan...');
        const aiPlan = await generate90DayPlan(assessmentWithUserId);
        console.log('90-day plan generated successfully:', aiPlan.plan?.programLengthDays || 'unknown length');
        await save(aiPlan);
        console.log('Plan saved successfully');
        return;
      } catch (error) {
        console.error('AI 90-day plan generation failed, falling back to mock plan:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }

      // Fallback to mock plan if AI generation fails
      if (hasSupabase) {
        try {
          const stubPlan = generateMockPlan(assessmentWithUserId);
          await save(stubPlan);
          return;
        } catch (error) {
          console.error('Error generating plan with Supabase:', error);
        }
      }

      const fallbackPlan = generateMockPlan(assessmentWithUserId);
      await save(fallbackPlan);
    };

    const run = async () => {
      try {
        await Promise.all([generatePlanData(), runProgressAnimation()]);
      } catch (error) {
        console.error('Error during loading animation:', error);
      } finally {
        if (!isCancelled) {
          router.replace('/program/overview');
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
      progress.stopAnimation();
      ripple.stopAnimation();
    };
  }, [assessment, user, router, save, generateMockPlan, runProgressAnimation, progress, ripple]);

  return (
    <View flex={1} backgroundColor="$background">
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
        <AthletIQLogo size={140} />
        <View
          style={{
            width: 260,
            height: 18,
            borderRadius: 999,
            backgroundColor: '#1f3026',
            borderWidth: 1,
            borderColor: '#2b6345',
            overflow: 'hidden',
            shadowColor: '#7AF0B3',
            shadowOpacity: 0.6,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
            position: 'relative',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 999,
              backgroundColor: '#7AF0B3',
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 260],
              }),
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              right: -30,
              top: -10,
              width: ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 80],
              }),
              height: ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 40],
              }),
              borderRadius: 999,
              backgroundColor: 'rgba(122, 240, 179, 0.35)',
              opacity: ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 0],
              }),
            }}
          />
        </View>
        <Text fontSize="$5" color="$placeholderColor">
          {loadingMessages[messageIndex]}
        </Text>
      </YStack>
    </View>
  );
}

