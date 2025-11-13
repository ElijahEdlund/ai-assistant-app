import { View, YStack, Text, XStack, Button } from 'tamagui';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { Chip } from '../../../components/ui/Chip';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

const goalOptions = [
  'Build Muscle / Strength',
  'Lose Fat / Tone Up',
  'Improve Endurance',
  'Increase Flexibility',
  'Improve Longevity / Health',
  'Enhance Athleticism',
  'Recomposition / Maintain',
];

const MAX_GOALS = 2;

export default function GoalsQuestion() {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useAssessmentStore();

  useDisableSwipeBack();

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goal)) {
        setError(null);
        return prev.filter((g) => g !== goal);
      }
      if (prev.length >= MAX_GOALS) {
        setError(`Select up to ${MAX_GOALS} goals.`);
        return prev;
      }
      setError(null);
      return [...prev, goal];
    });
  };

  const handleNext = async () => {
    if (selectedGoals.length === 0) {
      setError('Please choose at least one goal (maximum two).');
      return;
    }
    await update({ goals: selectedGoals });
    router.push('/onboarding/assessment/q-goal-description');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={5} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What are your goals?
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
            Select up to two primary goals
          </Text>
          <YStack gap="$3" alignItems="center">
            {goalOptions.map((goal) => (
              <Chip
                key={goal}
                label={goal}
                selected={selectedGoals.includes(goal)}
                onPress={() => toggleGoal(goal)}
              />
            ))}
          </YStack>
          {error && (
            <Text fontSize="$3" color="tomato" textAlign="center">
              {error}
            </Text>
          )}
          <XStack gap="$3" marginTop="$4" alignItems="center">
            <Button
              size="$3"
              circular
              icon={ArrowLeft}
              onPress={() => router.back()}
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
            />
            <CTAButton
              label="Continue"
              size="$4"
              onPress={handleNext}
              disabled={selectedGoals.length === 0}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

