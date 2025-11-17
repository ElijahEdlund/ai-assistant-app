import { View, YStack, Text, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { Chip } from '../../../components/ui/Chip';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export default function EquipmentQuestion() {
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();
  const [hasEquipment, setHasEquipment] = useState<boolean | null>(null);

  useDisableSwipeBack();

  useEffect(() => {
    if (assessment?.has_equipment !== undefined) {
      setHasEquipment(assessment.has_equipment);
    }
  }, [assessment?.has_equipment]);

  const handleNext = async () => {
    if (hasEquipment === null) return;
    await update({ has_equipment: hasEquipment });
    router.push('/onboarding/assessment/q-time');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={11} total={13} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            Do you have access to gym equipment?
          </Text>
          <XStack gap="$3" justifyContent="center">
            <Chip
              label="Yes"
              selected={hasEquipment === true}
              onPress={() => setHasEquipment(true)}
            />
            <Chip
              label="No"
              selected={hasEquipment === false}
              onPress={() => setHasEquipment(false)}
            />
          </XStack>
          <CTAButton
            label="Continue"
            size="$4"
            onPress={handleNext}
            disabled={hasEquipment === null}
          />
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

