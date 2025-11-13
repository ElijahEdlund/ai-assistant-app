import { View, YStack, Text, XStack, Spinner, Card, Button } from 'tamagui';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ProgressRing } from '../../components/ProgressRing';
import { goals, tasks, checkins } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';
import { Goal } from '../../lib/schemas';
import { calculateGoalMetrics } from '../../lib/metrics';

export default function GoalsScreen() {
  const [goalsList, setGoalsList] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const goalsData = await goals.getByUserId(user.id);
      setGoalsList(goalsData);

      // Calculate progress for each goal
      const progress: Record<string, number> = {};
      for (const goal of goalsData) {
        try {
          const goalTasks = await tasks.getByGoalId(goal.id!);
          const goalCheckins = await checkins.getByGoalId(goal.id!);
          const metrics = calculateGoalMetrics(goalTasks, goalCheckins);
          progress[goal.id!] = metrics.completionRate / 100;
        } catch (err) {
          console.error(`Error calculating progress for goal ${goal.id}:`, err);
          progress[goal.id!] = 0;
        }
      }
      setProgressMap(progress);
    } catch (error: any) {
      console.error('Error loading goals:', error);
      // If tables don't exist yet, show empty state
      if (error?.code === 'PGRST205' || error?.message?.includes('table')) {
        setGoalsList([]);
      }
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

  return (
    <View flex={1} backgroundColor="$background">
      <YStack flex={1} padding="$4" gap="$4">
        {goalsList.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
            <XStack alignItems="center" gap="$2">
              <Text color="$placeholderColor" fontSize="$5">
                No goals yet. Make one?
              </Text>
              <Button
                size="$4"
                circular
                onPress={() => router.replace('/')}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
              >
                <Text fontSize="$6" color="$color">
                  +
                </Text>
              </Button>
            </XStack>
          </YStack>
        ) : (
          goalsList.map((goal) => (
            <Card
              key={goal.id}
              elevate
              size="$4"
              bordered
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              onPress={() => router.push(`/goals/${goal.id}` as any)}
              pressStyle={{ scale: 0.98 }}
            >
              <Card.Header padded>
                <XStack gap="$4" alignItems="center">
                  <ProgressRing
                    progress={progressMap[goal.id!] || 0}
                    size={60}
                    strokeWidth={6}
                  />
                  <YStack flex={1} gap="$2">
                    <Text fontSize="$6" fontWeight="600" color="$color">
                      {goal.title}
                    </Text>
                    {goal.description && (
                      <Text fontSize="$3" color="$placeholderColor">
                        {goal.description}
                      </Text>
                    )}
                    <Text fontSize="$2" color="$placeholderColor">
                      {goal.timeframe_weeks} weeks • {goal.daily_minutes} min/day
                    </Text>
                  </YStack>
                </XStack>
              </Card.Header>
            </Card>
          ))
        )}
      </YStack>
    </View>
  );
}

