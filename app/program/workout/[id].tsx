import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, YStack, Text, Button } from 'tamagui';
import { ActivityIndicator } from 'react-native';
import { useProgramStore } from '../../../lib/state/program';
import { getWorkoutById } from '../../../lib/program/selectors';
import { WorkoutDetail } from '../../../components/workout/WorkoutDetail';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = useProgramStore((state) => state.plan);
  const load = useProgramStore((state) => state.load);
  const hydrateLogs = useProgramStore((state) => state.hydrateLogs);
  const workoutLogs = useProgramStore((state) => state.workoutLogs);
  const toggleWorkoutCompletion = useProgramStore((state) => state.toggleWorkoutCompletion);
  const updateWorkoutNote = useProgramStore((state) => state.updateWorkoutNote);

  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const loadingPlanRef = useRef(false);
  const hydratedLogsRef = useRef(false);

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

  useEffect(() => {
    if (hydratedLogsRef.current) {
      return;
    }
    hydratedLogsRef.current = true;
    hydrateLogs();
  }, [hydrateLogs]);

  const workout = useMemo(() => getWorkoutById(plan, id), [plan, id]);
  const log = id ? workoutLogs[id] : undefined;

  useEffect(() => {
    if (log?.note) {
      setNoteDraft(log.note);
    }
  }, [log?.note]);

  if (!id) {
    return (
      <View flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <Text color="$color">Workout not found.</Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
        <ActivityIndicator color="#7AF0B3" size="large" />
        <Text marginTop="$3" color="$placeholderColor">
          Loading workout...
        </Text>
      </View>
    );
  }

  const handleToggleCompletion = async () => {
    await toggleWorkoutCompletion(workout.id);
  };

  const handleSaveNote = async () => {
    if (savingNote) return;
    setSavingNote(true);
    try {
      await updateWorkoutNote(workout.id, noteDraft);
    } finally {
      setSavingNote(false);
    }
  };

  const handleExercisePress = (exercise: any) => {
    router.push({
      pathname: '/program/exercise/[name]',
      params: {
        name: exercise.name,
        workoutId: workout.id,
      },
    });
  };

  return (
    <View flex={1} backgroundColor="$background">
      <WorkoutDetail
        title={workout.name}
        tag={workout.tag}
        exercises={workout.exercises}
        completed={log?.completed ?? false}
        note={noteDraft}
        onToggleComplete={handleToggleCompletion}
        onChangeNote={setNoteDraft}
        onSaveNote={handleSaveNote}
        onExercisePress={handleExercisePress}
        footer={
          <YStack gap="$3">
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
        }
      />
    </View>
  );
}

