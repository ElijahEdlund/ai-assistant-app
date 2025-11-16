import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, YStack, Button, Text } from 'tamagui';
import { useProgramStore } from '../../../lib/state/program';
import { ExerciseDetail } from '../../../components/workout/ExerciseDetail';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator } from 'react-native';

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { name, workoutId } = useLocalSearchParams<{ name: string; workoutId: string }>();
  const plan = useProgramStore((state) => state.plan);
  const load = useProgramStore((state) => state.load);
  const loadingPlanRef = useRef(false);

  useDisableSwipeBack();

  useEffect(() => {
    if (plan || loadingPlanRef.current) {
      return;
    }
    loadingPlanRef.current = true;
    load().finally(() => {
      loadingPlanRef.current = false;
    });
  }, [plan, load]);

  const exercise = useMemo(() => {
    if (!plan || !workoutId || !name) return null;
    
    // Find the workout
    const workout = plan.plan?.workouts?.find((w: any) => w.id === workoutId);
    if (!workout) return null;
    
    // Find the exercise in the workout
    const foundExercise = workout.exercises?.find((ex: any) => ex.name === name);
    return foundExercise || null;
  }, [plan, workoutId, name]);

  if (!name) {
    return (
      <View flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Text color="$color">Exercise not found.</Text>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <ActivityIndicator color="#7AF0B3" size="large" />
        <Text marginTop="$3" color="$placeholderColor">
          Loading exercise...
        </Text>
      </View>
    );
  }

  return (
    <View flex={1} backgroundColor="$background">
      <ExerciseDetail exercise={exercise} />
      <YStack padding="$4" gap="$3">
        <Button
          size="$4"
          variant="outlined"
          borderColor="$borderColor"
          backgroundColor="transparent"
          onPress={() => router.back()}
        >
          <Text color="$color">Back</Text>
        </Button>
      </YStack>
    </View>
  );
}

