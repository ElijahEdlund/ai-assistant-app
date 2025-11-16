import { View, YStack, Text, XStack, Card, ScrollView, Button, TouchableOpacity } from 'tamagui';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Drawer } from '../../components/Drawer';
import { useProgramStore } from '../../lib/state/program';
import { useAssessmentStore } from '../../lib/state/assessment';
import { resetAll } from '../../lib/data/dataClient';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { useDisableSwipeBack } from '../../lib/gestures/swipeBack';
import { WeekStrip } from '../../components/schedule/WeekStrip';
import { buildWeekDays, getWorkoutForDate } from '../../lib/program/selectors';
import { getDayNumber, getTrainingForDay } from '../../lib/program/90dayHelpers';
import { WorkoutCard } from '../../components/workout/WorkoutCard';

export default function ProgramOverview() {
  const router = useRouter();
  const { plan, load } = useProgramStore();
  const { assessment } = useAssessmentStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedDate, setSelectedDate] = useState(today);

  useDisableSwipeBack();

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = useMemo(() => {
    if (!plan) return [];
    // Build week days for the 90-day program
    const programStart = plan.program_start_date;
    if (!programStart) return buildWeekDays(plan, weekOffset);
    
    // Calculate which week we're in (0-12 for 90 days)
    const startDate = dayjs(programStart);
    const todayDate = dayjs();
    const daysSinceStart = todayDate.diff(startDate, 'day');
    const currentWeek = Math.max(0, Math.floor(daysSinceStart / 7)) + weekOffset;
    
    // Ensure we don't go beyond 90 days
    const maxWeek = Math.floor(89 / 7); // Week 0-12 for 90 days
    const clampedWeek = Math.max(0, Math.min(currentWeek, maxWeek));
    
    // Build 7 days starting from the calculated week
    const weekStart = startDate.add(clampedWeek * 7, 'day');
    const days: any[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = weekStart.add(i, 'day');
      const dateStr = date.format('YYYY-MM-DD');
      const dayNumber = getDayNumber(plan, dateStr);
      
      let workouts: any[] = [];
      if (dayNumber) {
        const trainingDay = getTrainingForDay(plan, dayNumber);
        if (trainingDay && trainingDay.isWorkoutDay && trainingDay.workout?.exercises) {
          workouts = [{
            id: `day-${dayNumber}`,
            name: trainingDay.label,
            scheduledDate: dateStr,
            exercises: trainingDay.workout.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.restSeconds ? `${ex.restSeconds}s` : '60s',
            })),
            tag: trainingDay.focus,
            preview: `${trainingDay.workout.exercises.length} exercises`,
          }];
        }
      }
      
      days.push({
        date: dateStr,
        label: date.format('ddd'),
        dayOfMonth: date.format('DD'),
        isToday: date.isSame(dayjs(), 'day'),
        workouts,
      });
    }
    
    return days;
  }, [plan, weekOffset]);

  const selectedDayData = useMemo(() => {
    if (!plan) return null;
    const dayNumber = getDayNumber(plan, selectedDate);
    if (!dayNumber) return null;
    return getTrainingForDay(plan, dayNumber);
  }, [plan, selectedDate]);

  const selectedWorkout = useMemo(() => {
    if (!selectedDayData || !selectedDayData.isWorkoutDay) return null;
    return getWorkoutForDate(plan, selectedDate);
  }, [plan, selectedDate, selectedDayData]);

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
            Your 90-Day Program
          </Text>

          {/* Calendar Bar */}
          {weekDays.length > 0 && (
            <YStack gap="$3">
              <WeekStrip
                days={weekDays}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                onPrevWeek={() => setWeekOffset((prev) => Math.max(prev - 1, -12))}
                onNextWeek={() => setWeekOffset((prev) => Math.min(prev + 1, 12))}
              />
            </YStack>
          )}

          {/* Current Day Routine */}
          {selectedDayData && (
            <YStack gap="$3">
              {selectedDayData.isWorkoutDay && selectedWorkout ? (
                <WorkoutCard
                  title={selectedWorkout.name}
                  tag={selectedWorkout.tag}
                  exercises={selectedWorkout.exercises}
                  CTA={{
                    label: 'View workout details',
                    onPress: () => router.push(`/program/workout/${selectedWorkout.id}`),
                  }}
                />
              ) : (
                <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
                  <Card.Header padded>
                    <YStack gap="$3">
                      <Text fontSize="$6" fontWeight="600">
                        Rest Day
                      </Text>
                      {selectedDayData.recovery?.suggestions && (
                        <YStack gap="$2">
                          <Text fontSize="$4" color="$placeholderColor">
                            Recovery suggestions:
                          </Text>
                          {selectedDayData.recovery.suggestions.map((suggestion: string, idx: number) => (
                            <Text key={idx} fontSize="$4" color="$placeholderColor">
                              • {suggestion}
                            </Text>
                          ))}
                        </YStack>
                      )}
                    </YStack>
                  </Card.Header>
                </Card>
              )}
            </YStack>
          )}

          <YStack gap="$3" marginTop="$4">
            <Button
              size="$4"
              theme="alt1"
              onPress={() => router.push('/calendar')}
            >
              <Text color="$color" fontSize="$4">View full calendar</Text>
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

