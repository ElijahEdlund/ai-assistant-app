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

export default function GenderQuestion() {
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const router = useRouter();
  const { update } = useAssessmentStore();

  useDisableSwipeBack();

  const handleNext = async () => {
    if (gender) {
      await update({ gender });
      router.push('/onboarding/assessment/q-goals');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={4} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What's your gender?
          </Text>
          <YStack gap="$3" alignItems="center">
            <Chip
              label="Male"
              selected={gender === 'male'}
              onPress={() => setGender('male')}
            />
            <Chip
              label="Female"
              selected={gender === 'female'}
              onPress={() => setGender('female')}
            />
            <Chip
              label="Other"
              selected={gender === 'other'}
              onPress={() => setGender('other')}
            />
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
              disabled={!gender}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

