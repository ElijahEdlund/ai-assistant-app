import { View, YStack, Text, XStack, Spinner, Card, ScrollView, Button, Sheet } from 'tamagui';
import { useEffect, useState } from 'react';
import { hasSupabase, supabase, goals } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';
import { Task } from '../../lib/schemas';
import { getLocalDate, utcToLocal, addDays } from '../../lib/time';
import dayjs from 'dayjs';
import { Calendar } from 'react-native-calendars';
import { useProgramStore } from '../../lib/state/program';
import { addReflection, addCheckIn } from '../../lib/data/dataClient';
import { getDayNumber, getTrainingForDay, getNutritionForDay, getProgramDateRange } from '../../lib/program/90dayHelpers';
import { generateCheckInResponse } from '../../lib/ai';
import { Input } from 'tamagui';

interface DayTasks {
  date: string; // YYYY-MM-DD
  dayName: string;
  tasks: Task[];
}

export default function CalendarScreen() {
  const [daysTasks, setDaysTasks] = useState<DayTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [googleCalendarSynced, setGoogleCalendarSynced] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [showWorkoutSheet, setShowWorkoutSheet] = useState(false);
  const [showPreCheckIn, setShowPreCheckIn] = useState(false);
  const [showPostCheckIn, setShowPostCheckIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const { user } = useAuth();
  const { plan } = useProgramStore();

  useEffect(() => {
    if (user || plan) {
      loadCalendarTasks();
    }
  }, [user, plan]);

  // Load plan if not already loaded
  useEffect(() => {
    if (!plan) {
      useProgramStore.getState().load();
    }
  }, [plan]);

  const loadCalendarTasks = async () => {
    setLoading(true);
    try {
      const today = getLocalDate();
      const programRange = getProgramDateRange(plan);
      
      // Show 90 days if we have a program, otherwise show next 30 days
      const daysToShow = programRange ? 90 : 30;
      const startDate = programRange ? programRange.start : today;
      const daysList: DayTasks[] = [];

      for (let i = 0; i < daysToShow; i++) {
        const date = dayjs(startDate).add(i, 'day').format('YYYY-MM-DD');
        const dayName = dayjs(date).format('ddd, MMM D');
        const tasks: Task[] = [];

        // If we have a program, check for workout on this day
        if (plan && programRange) {
          const dayNumber = getDayNumber(plan, date);
          if (dayNumber) {
            const trainingDay = getTrainingForDay(plan, dayNumber);
            if (trainingDay && !trainingDay.isRestDay && trainingDay.exercises) {
              tasks.push({
                id: `workout-day-${dayNumber}`,
                title: trainingDay.label || 'Workout',
                description: `${trainingDay.exercises.length} exercises • ${trainingDay.primaryFocus}`,
                due_at: `${date}T09:00:00Z`,
                duration_min: plan.plan?.daily_minutes || 60,
                status: 'todo',
              } as Task);
            }
          }
        }

        // Also load tasks from Supabase if available
        if (user && hasSupabase) {
          try {
            const userGoals = await goals.getByUserId(user.id);
            const activeGoalIds = userGoals
              .filter((g) => g.status === 'active')
              .map((g) => g.id!);

            if (activeGoalIds.length > 0) {
              const startOfDay = `${date}T00:00:00Z`;
              const endOfDay = `${date}T23:59:59Z`;
              
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .in('goal_id', activeGoalIds)
                .gte('due_at', startOfDay)
                .lte('due_at', endOfDay)
                .order('due_at', { ascending: true });

              if (!error && data) {
                tasks.push(...data.map((t: any) => ({
                  ...t,
                  id: t.id,
                  milestone_id: t.milestone_id,
                  goal_id: t.goal_id,
                  title: t.title,
                  description: t.description,
                  day_index: t.day_index,
                  due_at: t.due_at,
                  duration_min: t.duration_min,
                  status: t.status,
                  note: t.note,
                })));
              }
            }
          } catch (error) {
            console.error('Error loading tasks for', date, error);
          }
        }

        daysList.push({ date, dayName, tasks });
      }

      setDaysTasks(daysList);
    } catch (error: any) {
      console.error('Error loading calendar tasks:', error);
      // If tables don't exist yet, show empty calendar
      if (error?.code === 'PGRST205' || error?.message?.includes('table')) {
        setDaysTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (utcString: string): string => {
    return utcToLocal(utcString).format('h:mm A');
  };

  if (loading) {
    return (
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" color="$color" />
        </YStack>
      </View>
    );
  }

  const handleGoogleCalendarSync = async () => {
    // TODO: Implement Google Calendar API integration
    // For now, just toggle the sync state
    setGoogleCalendarSynced(!googleCalendarSynced);
    // In production, this would:
    // 1. Request Google Calendar OAuth permissions
    // 2. Sync tasks to Google Calendar
    // 3. Import events from Google Calendar
  };

  // Merge program workouts with existing tasks
  useEffect(() => {
    if (!plan?.plan?.workouts) return;
    setDaysTasks((previous) => {
      if (!previous.length) return previous;
      const workoutDates = new Set(plan.plan.workouts.map((w: any) => w.scheduledDate));
      let changed = false;
      const next = previous.map((day) => {
        if (!workoutDates.has(day.date)) {
          return day;
        }
        const workout = plan.plan.workouts.find((w: any) => w.scheduledDate === day.date);
        if (!workout || day.tasks.some((t) => t.id?.startsWith('workout-'))) {
          return day;
        }
        changed = true;
        return {
          ...day,
          tasks: [
            ...day.tasks,
            {
              id: `workout-${workout.day}`,
              title: workout.name,
              description: `${workout.exercises?.length || 0} exercises`,
              due_at: `${day.date}T09:00:00Z`,
              duration_min: 60,
              status: 'todo',
            } as Task,
          ],
        };
      });
      return changed ? next : previous;
    });
  }, [plan]);

  const markedDates: any = {};
  daysTasks.forEach((day) => {
    if (day.tasks.length > 0) {
      markedDates[day.date] = {
        marked: true,
        dotColor: '#fff',
      };
    }
  });
  markedDates[selectedDate] = {
    ...markedDates[selectedDate],
    selected: true,
    selectedColor: '#333',
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    if (plan) {
      const dayNumber = getDayNumber(plan, day.dateString);
      if (dayNumber) {
        const trainingDay = getTrainingForDay(plan, dayNumber);
        if (trainingDay && !trainingDay.isRestDay) {
          // Find workout in plan structure
          const workout = plan.plan?.workouts?.find((w: any) => w.scheduledDate === day.dateString);
          if (workout) {
            setSelectedWorkout({ ...workout, dayNumber, trainingDay });
            setShowWorkoutSheet(true);
          } else if (trainingDay.exercises) {
            // Create workout object from training day
            setSelectedWorkout({
              id: `day-${dayNumber}`,
              name: trainingDay.label,
              focus: trainingDay.primaryFocus,
              scheduledDate: day.dateString,
              dayNumber,
              exercises: trainingDay.exercises,
            });
            setShowWorkoutSheet(true);
          }
        }
      } else if (plan?.plan?.workouts) {
        // Fallback for old plan format
        const workout = plan.plan.workouts.find((w: any) => w.scheduledDate === day.dateString);
        if (workout) {
          setSelectedWorkout(workout);
          setShowWorkoutSheet(true);
        }
      }
    }
  };

  return (
    <View flex={1} backgroundColor="$background">
      <ScrollView>
        <YStack flex={1} padding="$4" gap="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <Text fontSize="$9" fontWeight="bold">
              Calendar
            </Text>
            <Button
              size="$3"
              onPress={handleGoogleCalendarSync}
              backgroundColor={googleCalendarSynced ? "$green10" : "$backgroundHover"}
              borderColor="$borderColor"
            >
              <Text fontSize="$3" color="$color">
                {googleCalendarSynced ? '✓ Synced' : 'Sync Google'}
              </Text>
            </Button>
          </XStack>

          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#000000',
              calendarBackground: '#000000',
              textSectionTitleColor: '#fff',
              selectedDayBackgroundColor: '#333',
              selectedDayTextColor: '#fff',
              todayTextColor: '#fff',
              dayTextColor: '#fff',
              textDisabledColor: '#666',
              dotColor: '#fff',
              selectedDotColor: '#fff',
              arrowColor: '#fff',
              monthTextColor: '#fff',
              indicatorColor: '#fff',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
            style={{
              borderRadius: 16,
              padding: 8,
              backgroundColor: '#1a1a1a',
            }}
          />

          <Text fontSize="$7" fontWeight="bold" marginTop="$4">
            {plan?.program_start_date ? '90-Day Program' : 'Next 30 Days'}
          </Text>
          {daysTasks.map((day) => (
            <Card
              key={day.date}
              elevate
              size="$4"
              bordered
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
            >
              <Card.Header padded>
                <YStack gap="$3">
                  <Text fontSize="$6" fontWeight="600" color="$color">
                    {day.dayName}
                  </Text>
                  {day.tasks.length === 0 ? (
                    <Text fontSize="$3" color="$placeholderColor">
                      No tasks scheduled
                    </Text>
                  ) : (
                    day.tasks.map((task) => (
                      <XStack
                        key={task.id}
                        gap="$3"
                        padding="$2"
                        backgroundColor="$background"
                        borderRadius="$2"
                        marginTop="$2"
                      >
                        <YStack flex={1} gap="$1">
                          <Text fontSize="$4" fontWeight="500">
                            {task.title}
                          </Text>
                          {task.description && (
                            <Text fontSize="$3" color="$placeholderColor">
                              {task.description}
                            </Text>
                          )}
                          <XStack gap="$3">
                            <Text fontSize="$2" color="$placeholderColor">
                              {formatTime(task.due_at)}
                            </Text>
                            <Text fontSize="$2" color="$placeholderColor">
                              {task.duration_min} min
                            </Text>
                            <Text
                              fontSize="$2"
                              color={
                                task.status === 'done'
                                  ? 'green'
                                  : task.status === 'doing'
                                  ? 'yellow'
                                  : '$placeholderColor'
                              }
                            >
                              {task.status}
                            </Text>
                          </XStack>
                        </YStack>
                      </XStack>
                    ))
                  )}
                </YStack>
              </Card.Header>
            </Card>
          ))}
        </YStack>
      </ScrollView>

      <Sheet
        modal
        open={showWorkoutSheet}
        onOpenChange={setShowWorkoutSheet}
        snapPoints={[70]}
        dismissOnSnapToBottom
        zIndex={100_000}
      >
        <Sheet.Overlay />
        <Sheet.Handle />
        <Sheet.Frame backgroundColor="$background" padding="$4">
          {selectedWorkout && !showPreCheckIn && !showPostCheckIn && (
            <YStack gap="$4">
              <Text fontSize="$8" fontWeight="bold">
                {selectedWorkout.name}
              </Text>
              {selectedWorkout.focus && (
                <Text fontSize="$4" color="$placeholderColor">
                  {selectedWorkout.focus}
                </Text>
              )}
              
              {/* Nutrition Section */}
              {plan && selectedWorkout.dayNumber && (() => {
                const nutrition = getNutritionForDay(plan, selectedWorkout.dayNumber);
                if (nutrition) {
                  return (
                    <Card size="$3" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
                      <Card.Header padded>
                        <YStack gap="$2">
                          <Text fontSize="$5" fontWeight="600">
                            Today's Nutrition
                          </Text>
                          <XStack gap="$4">
                            <YStack>
                              <Text fontSize="$3" color="$placeholderColor">Calories</Text>
                              <Text fontSize="$4" fontWeight="600">{nutrition.calories}</Text>
                            </YStack>
                            <YStack>
                              <Text fontSize="$3" color="$placeholderColor">Protein</Text>
                              <Text fontSize="$4" fontWeight="600">{nutrition.proteinG}g</Text>
                            </YStack>
                            <YStack>
                              <Text fontSize="$3" color="$placeholderColor">Carbs</Text>
                              <Text fontSize="$4" fontWeight="600">{nutrition.carbsG}g</Text>
                            </YStack>
                            <YStack>
                              <Text fontSize="$3" color="$placeholderColor">Fats</Text>
                              <Text fontSize="$4" fontWeight="600">{nutrition.fatsG}g</Text>
                            </YStack>
                          </XStack>
                          {nutrition.meals && nutrition.meals.length > 0 && (
                            <YStack gap="$2" marginTop="$2">
                              <Text fontSize="$4" fontWeight="600">Suggested Meals</Text>
                              {nutrition.meals.map((meal: any, idx: number) => (
                                <YStack key={idx} gap="$1">
                                  <Text fontSize="$3" fontWeight="500">{meal.name} ({meal.timeOfDay})</Text>
                                  <Text fontSize="$2" color="$placeholderColor">{meal.ingredients?.join(', ')}</Text>
                                </YStack>
                              ))}
                            </YStack>
                          )}
                        </YStack>
                      </Card.Header>
                    </Card>
                  );
                }
                return null;
              })()}

              <YStack gap="$3">
                <Text fontSize="$6" fontWeight="600">
                  Exercises
                </Text>
                {selectedWorkout.exercises?.map((ex: any, idx: number) => (
                  <Card key={idx} size="$3" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
                    <Card.Header padded>
                      <YStack gap="$1">
                        <Text fontSize="$5" fontWeight="500">
                          {ex.name}
                        </Text>
                        <Text fontSize="$3" color="$placeholderColor">
                          {ex.sets} sets × {ex.reps} reps
                          {ex.rest && ` • ${ex.rest} rest`}
                          {ex.tempo && ` • Tempo: ${ex.tempo}`}
                          {ex.rir !== undefined && ` • RIR: ${ex.rir}`}
                        </Text>
                        {ex.notes && (
                          <Text fontSize="$2" color="$placeholderColor" marginTop="$1">
                            {ex.notes}
                          </Text>
                        )}
                      </YStack>
                    </Card.Header>
                  </Card>
                ))}
              </YStack>
              
              <YStack gap="$2">
                <Button
                  size="$4"
                  variant="outlined"
                  borderColor="$borderColor"
                  backgroundColor="transparent"
                  onPress={() => {
                    setShowPreCheckIn(true);
                  }}
                >
                  <Text color="$color">Pre-Workout Check-in</Text>
                </Button>
                <Button
                  size="$4"
                  theme="active"
                  onPress={async () => {
                    if (user) {
                      await addReflection({
                        date: selectedWorkout.scheduledDate,
                        note: 'Workout completed',
                      });
                    }
                    setShowPostCheckIn(true);
                  }}
                >
                  <Text color="$color">Mark Complete</Text>
                </Button>
              </YStack>
            </YStack>
          )}

          {/* Pre-Workout Check-in */}
          {showPreCheckIn && (
            <YStack gap="$4">
              <Text fontSize="$7" fontWeight="bold">
                Pre-Workout Check-in
              </Text>
              <Text fontSize="$4" color="$placeholderColor">
                How are you feeling before this workout? (energy, mood, soreness)
              </Text>
              <Input
                multiline
                numberOfLines={4}
                placeholder="Share how you're feeling..."
                value={checkInMessage}
                onChangeText={setCheckInMessage}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
                color="$color"
                placeholderTextColor="$placeholderColor"
              />
              {checkInResponse && (
                <Card size="$3" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
                  <Card.Header padded>
                    <Text fontSize="$4" color="$color">
                      {checkInResponse}
                    </Text>
                  </Card.Header>
                </Card>
              )}
              <XStack gap="$2">
                <Button
                  size="$4"
                  variant="outlined"
                  borderColor="$borderColor"
                  backgroundColor="transparent"
                  flex={1}
                  onPress={() => {
                    setShowPreCheckIn(false);
                    setCheckInMessage('');
                    setCheckInResponse('');
                  }}
                >
                  <Text color="$color">Cancel</Text>
                </Button>
                <Button
                  size="$4"
                  theme="active"
                  flex={1}
                  disabled={!checkInMessage.trim() || submittingCheckIn}
                  onPress={async () => {
                    if (!checkInMessage.trim() || !user || !selectedWorkout) return;
                    setSubmittingCheckIn(true);
                    try {
                      const aiResponse = await generateCheckInResponse(
                        checkInMessage,
                        'pre',
                        {
                          dayNumber: selectedWorkout.dayNumber,
                          workoutName: selectedWorkout.name,
                        }
                      );
                      setCheckInResponse(aiResponse);
                      
                      await addCheckIn({
                        program_id: plan?.id,
                        day_number: selectedWorkout.dayNumber,
                        date: selectedWorkout.scheduledDate,
                        type: 'pre',
                        user_message: checkInMessage,
                        ai_response: aiResponse,
                      });
                    } catch (error) {
                      console.error('Error submitting check-in:', error);
                    } finally {
                      setSubmittingCheckIn(false);
                    }
                  }}
                >
                  <Text color="$color">{submittingCheckIn ? 'Submitting...' : 'Submit'}</Text>
                </Button>
              </XStack>
            </YStack>
          )}

          {/* Post-Workout Check-in */}
          {showPostCheckIn && (
            <YStack gap="$4">
              <Text fontSize="$7" fontWeight="bold">
                Post-Workout Check-in
              </Text>
              <Text fontSize="$4" color="$placeholderColor">
                How did this session feel? Anything too easy, too hard, or painful?
              </Text>
              <Input
                multiline
                numberOfLines={4}
                placeholder="Share your experience..."
                value={checkInMessage}
                onChangeText={setCheckInMessage}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
                color="$color"
                placeholderTextColor="$placeholderColor"
              />
              {checkInResponse && (
                <Card size="$3" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
                  <Card.Header padded>
                    <Text fontSize="$4" color="$color">
                      {checkInResponse}
                    </Text>
                  </Card.Header>
                </Card>
              )}
              <XStack gap="$2">
                <Button
                  size="$4"
                  variant="outlined"
                  borderColor="$borderColor"
                  backgroundColor="transparent"
                  flex={1}
                  onPress={() => {
                    setShowPostCheckIn(false);
                    setCheckInMessage('');
                    setCheckInResponse('');
                    setShowWorkoutSheet(false);
                  }}
                >
                  <Text color="$color">Skip</Text>
                </Button>
                <Button
                  size="$4"
                  theme="active"
                  flex={1}
                  disabled={!checkInMessage.trim() || submittingCheckIn}
                  onPress={async () => {
                    if (!checkInMessage.trim() || !user || !selectedWorkout) return;
                    setSubmittingCheckIn(true);
                    try {
                      const aiResponse = await generateCheckInResponse(
                        checkInMessage,
                        'post',
                        {
                          dayNumber: selectedWorkout.dayNumber,
                          workoutName: selectedWorkout.name,
                        }
                      );
                      setCheckInResponse(aiResponse);
                      
                      await addCheckIn({
                        program_id: plan?.id,
                        day_number: selectedWorkout.dayNumber,
                        date: selectedWorkout.scheduledDate,
                        type: 'post',
                        user_message: checkInMessage,
                        ai_response: aiResponse,
                      });
                    } catch (error) {
                      console.error('Error submitting check-in:', error);
                    } finally {
                      setSubmittingCheckIn(false);
                    }
                  }}
                >
                  <Text color="$color">{submittingCheckIn ? 'Submitting...' : 'Submit'}</Text>
                </Button>
              </XStack>
            </YStack>
          )}
        </Sheet.Frame>
      </Sheet>
    </View>
  );
}

