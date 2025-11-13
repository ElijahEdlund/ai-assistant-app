import { View, YStack, Text, XStack, Card, ScrollView, Button } from 'tamagui';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Drawer } from '../../components/Drawer';
import { useProgramStore } from '../../lib/state/program';
import { useAssessmentStore } from '../../lib/state/assessment';
import { resetAll } from '../../lib/data/dataClient';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { useDisableSwipeBack } from '../../lib/gestures/swipeBack';

export default function ProgramOverview() {
  const router = useRouter();
  const { plan, load } = useProgramStore();
  const { assessment } = useAssessmentStore();
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [weekPreview, setWeekPreview] = useState<any[]>([]);

  useDisableSwipeBack();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (plan?.plan) {
      const today = dayjs().format('YYYY-MM-DD');
      const workout = plan.plan.workouts?.find((w: any) => w.scheduledDate === today);
      setTodayWorkout(workout);

      // Get next 7 days
      const preview = [];
      for (let i = 0; i < 7; i++) {
        const date = dayjs().add(i, 'day').format('YYYY-MM-DD');
        const dayWorkout = plan.plan.workouts?.find((w: any) => w.scheduledDate === date);
        preview.push({
          date,
          dayName: dayjs(date).format('ddd'),
          workout: dayWorkout,
        });
      }
      setWeekPreview(preview);
    }
  }, [plan]);

  const handleRetakeAssessment = () => {
    Alert.alert(
      'Retake Assessment',
      'This will reset your current plan. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            router.replace('/onboarding/assessment');
          },
        },
      ]
    );
  };

  const name = assessment?.name || 'there';

  return (
    <View flex={1} backgroundColor="$background">
      <Drawer />
      <ScrollView>
        <YStack flex={1} padding="$4" gap="$4">
          <Text fontSize="$9" fontWeight="bold" textAlign="center" marginTop="$4">
            Welcome, {name}
          </Text>
          <Text fontSize="$5" color="$placeholderColor" textAlign="center" marginBottom="$4">
            Week 1 of {plan?.plan?.weeks || 12}
          </Text>

          {todayWorkout && (
            <Card elevate size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
              <Card.Header padded>
                <YStack gap="$3">
                  <Text fontSize="$7" fontWeight="600">
                    Today's Workout
                  </Text>
                  <Text fontSize="$6" fontWeight="bold" color="$color">
                    {todayWorkout.name}
                  </Text>
                  <YStack gap="$2" marginTop="$2">
                    {todayWorkout.exercises?.map((ex: any, idx: number) => (
                      <Text key={idx} fontSize="$4" color="$placeholderColor">
                        • {ex.name} - {ex.sets} sets × {ex.reps} reps
                      </Text>
                    ))}
                  </YStack>
                </YStack>
              </Card.Header>
            </Card>
          )}

          <YStack gap="$3">
            <Text fontSize="$7" fontWeight="bold">
              Week Preview
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {weekPreview.map((day, idx) => (
                <Card
                  key={idx}
                  size="$3"
                  bordered
                  backgroundColor={day.workout ? "$backgroundFocus" : "$backgroundHover"}
                  borderColor="$borderColor"
                  minWidth={80}
                >
                  <Card.Header padded>
                    <YStack gap="$2" alignItems="center">
                      <Text fontSize="$3" color="$placeholderColor">
                        {day.dayName}
                      </Text>
                      <Text fontSize="$4" fontWeight="600" textAlign="center">
                        {day.workout ? 'Workout' : 'Rest'}
                      </Text>
                    </YStack>
                  </Card.Header>
                </Card>
              ))}
            </XStack>
          </YStack>

          <YStack gap="$3" marginTop="$4">
            <Button
              size="$5"
              theme="active"
              onPress={() => router.push('/program/schedule')}
            >
              <Text color="$color" fontSize="$5">See my plan</Text>
            </Button>
            <Button
              size="$4"
              theme="alt1"
              onPress={() => router.push('/calendar')}
            >
              <Text color="$color" fontSize="$4">View calendar</Text>
            </Button>
            <Button
              size="$4"
              variant="outlined"
              onPress={handleRetakeAssessment}
              borderColor="$borderColor"
              backgroundColor="transparent"
            >
              <Text color="$color" fontSize="$4">Retake Assessment</Text>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}

