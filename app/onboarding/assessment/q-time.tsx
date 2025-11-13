import { View, YStack, Text, XStack, Button } from 'tamagui';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { Chip } from '../../../components/ui/Chip';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function TimeQuestion() {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useAssessmentStore();

  useDisableSwipeBack();

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        setError(null);
        return prev.filter((d) => d !== day);
      }
      setError(null);
      return [...prev, day];
    });
  };

  const weeklyDays = useMemo(() => selectedDays.length, [selectedDays]);
  const isValid = weeklyDays >= 2 && weeklyDays <= 6;

  const handleNext = async () => {
    if (!isValid) {
      setError('Please select between 2 and 6 training days to match your plan.');
      return;
    }
    await update({
      weekly_days: weeklyDays,
      available_days: selectedDays,
    });
    router.push('/onboarding/assessment/q-hours');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={8} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            Which days can you train?
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center">
            Select between two and six days you’re typically available.
          </Text>
          <YStack gap="$3" alignItems="center" marginTop="$4">
            {DAY_OPTIONS.map((day) => (
              <Chip
                key={day}
                label={day}
                selected={selectedDays.includes(day)}
                onPress={() => toggleDay(day)}
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
              disabled={!isValid}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

