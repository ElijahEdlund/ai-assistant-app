import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { View, YStack, Text, Card } from 'tamagui';
import { ScrollView } from 'react-native';
import { WeekStrip } from '../../components/schedule/WeekStrip';
import { useProgramStore } from '../../lib/state/program';
import { buildWeekDays, getWorkoutForDate } from '../../lib/program/selectors';
import { CTAButton } from '../../components/ui/CTAButton';
import { WorkoutCard } from '../../components/workout/WorkoutCard';
import { useRouter } from 'expo-router';
import { useDisableSwipeBack } from '../../lib/gestures/swipeBack';

export default function ProgramScheduleScreen() {
  const router = useRouter();
  const plan = useProgramStore((state) => state.plan);
  const load = useProgramStore((state) => state.load);
  const hydrateLogs = useProgramStore((state) => state.hydrateLogs);
  const workoutLogs = useProgramStore((state) => state.workoutLogs);

  const [weekOffset, setWeekOffset] = useState(0);
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);
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

  const weekDays = useMemo(() => buildWeekDays(plan, weekOffset), [plan, weekOffset]);

  useEffect(() => {
    if (!weekDays.find((day) => day.date === selectedDate) && weekDays.length > 0) {
      setSelectedDate(weekDays[0].date);
    }
  }, [weekDays, selectedDate]);

  const selectedWorkout = useMemo(
    () => getWorkoutForDate(plan, selectedDate),
    [plan, selectedDate]
  );

  const completed = selectedWorkout ? workoutLogs[selectedWorkout.id]?.completed ?? false : false;

  return (
    <View flex={1} backgroundColor="$background">
      <ScrollView>
        <YStack padding="$4" gap="$4">
          <YStack gap="$2">
            <Text fontSize="$9" fontWeight="bold">
              Your Schedule
            </Text>
            <Text fontSize="$4" color="$placeholderColor">
              Swipe through your week to see what&apos;s lined up.
            </Text>
          </YStack>

          <WeekStrip
            days={weekDays}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
            onNextWeek={() => setWeekOffset((prev) => prev + 1)}
          />

          {selectedWorkout ? (
            <WorkoutCard
              title={selectedWorkout.name}
              tag={selectedWorkout.tag}
              exercises={selectedWorkout.exercises}
              completed={completed}
              CTA={{
                label: 'Open workout',
                onPress: () => router.push(`/program/workout/${selectedWorkout.id}`),
              }}
            />
          ) : (
            <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
              <Card.Header padded>
                <YStack gap="$3">
                  <Text fontSize="$6" fontWeight="600">
                    Recovery tips
                  </Text>
                  <Text fontSize="$4" color="$placeholderColor">
                    Focus on quality sleep, hydration, and light mobility. Tomorrow&apos;s session will
                    thank you.
                  </Text>
                  <CTAButton
                    label="Add mobility session"
                    size="$4"
                    variant="secondary"
                    onPress={() => router.push('/calendar')}
                    fullWidth={false}
                  />
                </YStack>
              </Card.Header>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </View>
  );
}

