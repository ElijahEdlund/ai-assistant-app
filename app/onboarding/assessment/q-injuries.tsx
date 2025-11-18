import { View, YStack, Text, XStack, Button, Input } from 'tamagui';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';

export default function InjuriesQuestion() {
  const [injuries, setInjuries] = useState('');
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  useEffect(() => {
    if (assessment?.injuries_or_pain) {
      setInjuries(assessment.injuries_or_pain);
    }
  }, [assessment?.injuries_or_pain]);

  const handleNext = async () => {
    await update({ injuries_or_pain: injuries.trim() || '' });
    router.push('/onboarding/assessment/q-priority-areas');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={7} total={13} />
        <ScrollView>
          <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
            <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
              Any injuries or pain?
            </Text>
            <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
              We'll modify exercises to work around any limitations
            </Text>
            <Input
              placeholder="e.g., Lower back pain, knee injury, shoulder impingement..."
              value={injuries}
              onChangeText={setInjuries}
              multiline
              numberOfLines={4}
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
              placeholderTextColor="$placeholderColor"
              fontSize="$5"
              minHeight={120}
              textAlignVertical="top"
            />
            <Text fontSize="$3" color="$placeholderColor" textAlign="center">
              Leave blank if none
            </Text>
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
                flex={1}
                fullWidth={false}
              />
            </XStack>
          </YStack>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}


