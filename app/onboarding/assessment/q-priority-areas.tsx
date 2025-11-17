import { View, YStack, Text, XStack, Button, Input } from 'tamagui';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';

export default function PriorityAreasQuestion() {
  const [priorityAreas, setPriorityAreas] = useState('');
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  useEffect(() => {
    if (assessment?.priority_areas) {
      setPriorityAreas(assessment.priority_areas);
    }
  }, [assessment?.priority_areas]);

  const handleNext = async () => {
    await update({ priority_areas: priorityAreas.trim() || '' });
    router.push('/onboarding/assessment/q-activity-level');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={8} total={13} />
        <ScrollView>
          <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
            <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
              Priority areas to focus on?
            </Text>
            <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$4">
              e.g., glutes, posture, arms, hamstrings, core...
            </Text>
            <Input
              placeholder="e.g., glutes, posture, hamstrings, upper back..."
              value={priorityAreas}
              onChangeText={setPriorityAreas}
              multiline
              numberOfLines={3}
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
              placeholderTextColor="$placeholderColor"
              fontSize="$5"
              minHeight={100}
              textAlignVertical="top"
            />
            <Text fontSize="$3" color="$placeholderColor" textAlign="center">
              Leave blank if no specific priorities
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

