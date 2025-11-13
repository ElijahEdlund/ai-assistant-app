import { View, YStack, Text, Input } from 'tamagui';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export default function AgeQuestion() {
  const [age, setAge] = useState('');
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  const handleNext = async () => {
    const ageNum = parseInt(age, 10);
    if (ageNum >= 18 && ageNum <= 85) {
      await update({ age: ageNum });
      router.push('/onboarding/assessment/q-weight');
    }
  };

  const isValid = age && parseInt(age, 10) >= 18 && parseInt(age, 10) <= 85;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={1} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            How old are you?
          </Text>
          <Input
            placeholder="Age (18-85)"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            color="$color"
            placeholderTextColor="$placeholderColor"
            fontSize="$6"
            textAlign="center"
            maxLength={2}
          />
          <CTAButton
            label="Continue"
            size="$4"
            onPress={handleNext}
            disabled={!isValid}
          />
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

