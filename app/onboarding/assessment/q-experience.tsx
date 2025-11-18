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

const experienceOptions = [
  { value: 'beginner', label: 'Beginner', description: 'New to structured training' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years of consistent training' },
  { value: 'advanced', label: 'Advanced', description: '3+ years of structured training' },
];

export default function ExperienceQuestion() {
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  const handleNext = async () => {
    if (!selectedExperience) return;
    await update({ training_experience: selectedExperience as 'beginner' | 'intermediate' | 'advanced' });
    router.push('/onboarding/assessment/q-injuries');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={6} total={13} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What's your training experience?
          </Text>
          <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
            This helps us tailor the program to your level
          </Text>
          <YStack gap="$3" alignItems="center" marginTop="$4">
            {experienceOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={selectedExperience === option.value}
                onPress={() => setSelectedExperience(option.value)}
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
              disabled={!selectedExperience}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}


