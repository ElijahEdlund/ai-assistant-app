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

const activityLevelOptions = [
  { 
    value: 'sedentary', 
    label: 'Sedentary', 
    description: 'Little to no exercise, desk job' 
  },
  { 
    value: 'lightly_active', 
    label: 'Lightly Active', 
    description: 'Light exercise 1-3 days/week' 
  },
  { 
    value: 'moderately_active', 
    label: 'Moderately Active', 
    description: 'Moderate exercise 3-5 days/week' 
  },
  { 
    value: 'very_active', 
    label: 'Very Active', 
    description: 'Hard exercise 6-7 days/week' 
  },
];

export default function ActivityLevelQuestion() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  const handleNext = async () => {
    if (!selectedLevel) return;
    await update({ 
      activity_level: selectedLevel as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' 
    });
    router.push('/onboarding/assessment/q-equipment');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={9} total={13} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What's your daily activity level?
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
            This helps us calculate your nutrition needs
          </Text>
          <YStack gap="$3" alignItems="center" marginTop="$4">
            {activityLevelOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={selectedLevel === option.value}
                onPress={() => setSelectedLevel(option.value)}
              />
            ))}
          </YStack>
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
              disabled={!selectedLevel}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

