import { View, YStack, Text, XStack, Spinner, Card, ScrollView } from 'tamagui';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goals, milestones, tasks, checkins } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';
import { Goal, Milestone, Task, Checkin } from '../../lib/schemas';
import { calculateGoalMetrics, GoalMetrics } from '../../lib/metrics';
import { generateCoachHint } from '../../lib/ai';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [milestonesList, setMilestonesList] = useState<Milestone[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [checkinsList, setCheckinsList] = useState<Checkin[]>([]);
  const [metrics, setMetrics] = useState<GoalMetrics | null>(null);
  const [coachHint, setCoachHint] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (id && user) {
      loadGoalData();
    }
  }, [id, user]);

  const loadGoalData = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [goalData, milestonesData, tasksData, checkinsData] = await Promise.all([
        goals.getById(id),
        milestones.getByGoalId(id),
        tasks.getByGoalId(id),
        checkins.getByGoalId(id),
      ]);

      if (!goalData) {
        router.back();
        return;
      }

      setGoal(goalData);
      setMilestonesList(milestonesData);
      setTasksList(tasksData);
      setCheckinsList(checkinsData);

      const calculatedMetrics = calculateGoalMetrics(tasksData, checkinsData);
      setMetrics(calculatedMetrics);

      // Generate coach hint
      try {
        const hint = await generateCoachHint({
          streakDays: calculatedMetrics.streakDays,
          onTimePercentage: calculatedMetrics.onTimePercentage,
          completionRate: calculatedMetrics.completionRate,
          recentCheckins: checkinsData.filter((c) => {
            const daysAgo = new Date().getTime() - new Date(c.completed_at).getTime();
            return daysAgo <= 7 * 24 * 60 * 60 * 1000;
          }).length,
          tone: 'encouraging',
        });
        setCoachHint(hint);
      } catch (error) {
        console.error('Error generating coach hint:', error);
        setCoachHint('Keep up the great work!');
      }
    } catch (error) {
      console.error('Error loading goal data:', error);
    } finally {
      setLoading(false);
    }
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

  if (!goal) {
    return null;
  }

  const upcomingTasks = tasksList
    .filter((t) => t.status === 'todo')
    .slice(0, 5);

  return (
    <View flex={1} backgroundColor="$background">
      <ScrollView>
        <YStack flex={1} padding="$4" gap="$4">
          <Text fontSize="$9" fontWeight="bold">
            {goal.title}
          </Text>
          {goal.description && (
            <Text fontSize="$4" color="$placeholderColor">
              {goal.description}
            </Text>
          )}

          {/* Metrics Panel */}
          {metrics && (
            <Card elevate size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
              <Card.Header padded>
                <YStack gap="$4">
                  <Text fontSize="$6" fontWeight="600">
                    Metrics
                  </Text>
                  <XStack gap="$4" flexWrap="wrap">
                    <YStack gap="$2" flex={1} minWidth={120}>
                      <Text fontSize="$3" color="$placeholderColor">
                        Streak
                      </Text>
                      <Text fontSize="$7" fontWeight="bold">
                        {metrics.streakDays} days
                      </Text>
                    </YStack>
                    <YStack gap="$2" flex={1} minWidth={120}>
                      <Text fontSize="$3" color="$placeholderColor">
                        On-Time
                      </Text>
                      <Text fontSize="$7" fontWeight="bold">
                        {metrics.onTimePercentage.toFixed(0)}%
                      </Text>
                    </YStack>
                    <YStack gap="$2" flex={1} minWidth={120}>
                      <Text fontSize="$3" color="$placeholderColor">
                        Completion
                      </Text>
                      <Text fontSize="$7" fontWeight="bold">
                        {metrics.completionRate.toFixed(0)}%
                      </Text>
                    </YStack>
                  </XStack>
                  <YStack gap="$2" marginTop="$2">
                    <Text fontSize="$3" color="$placeholderColor">
                      This Week
                    </Text>
                    <Text fontSize="$4">
                      {metrics.completedTasks} of {metrics.totalTasks} tasks completed
                    </Text>
                  </YStack>
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Coach Hint */}
          {coachHint && (
            <Card elevate size="$4" bordered backgroundColor="$backgroundFocus" borderColor="$borderColor">
              <Card.Header padded>
                <YStack gap="$2">
                  <Text fontSize="$5" fontWeight="600" color="$color">
                    💡 Coach Hint
                  </Text>
                  <Text fontSize="$4" color="$color">
                    {coachHint}
                  </Text>
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Milestones */}
          <YStack gap="$3">
            <Text fontSize="$7" fontWeight="bold">
              Milestones
            </Text>
            {milestonesList.map((milestone) => (
              <Card
                key={milestone.id}
                size="$3"
                bordered
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
              >
                <Card.Header padded>
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="$5" fontWeight="600">
                        {milestone.title}
                      </Text>
                      <Text fontSize="$2" color="$placeholderColor">
                        Day {milestone.day_index}
                      </Text>
                    </XStack>
                    {milestone.description && (
                      <Text fontSize="$3" color="$placeholderColor">
                        {milestone.description}
                      </Text>
                    )}
                    <Text fontSize="$2" color="$placeholderColor">
                      Status: {milestone.status}
                    </Text>
                  </YStack>
                </Card.Header>
              </Card>
            ))}
          </YStack>

          {/* Upcoming Tasks */}
          <YStack gap="$3">
            <Text fontSize="$7" fontWeight="bold">
              Upcoming Tasks
            </Text>
            {upcomingTasks.length === 0 ? (
              <Text color="$placeholderColor">No upcoming tasks</Text>
            ) : (
              upcomingTasks.map((task) => (
                <Card
                  key={task.id}
                  size="$3"
                  bordered
                  backgroundColor="$backgroundHover"
                  borderColor="$borderColor"
                >
                  <Card.Header padded>
                    <YStack gap="$2">
                      <Text fontSize="$4" fontWeight="600">
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text fontSize="$3" color="$placeholderColor">
                          {task.description}
                        </Text>
                      )}
                      <XStack gap="$3">
                        <Text fontSize="$2" color="$placeholderColor">
                          {task.duration_min} min
                        </Text>
                        <Text fontSize="$2" color="$placeholderColor">
                          Status: {task.status}
                        </Text>
                      </XStack>
                    </YStack>
                  </Card.Header>
                </Card>
              ))
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}

