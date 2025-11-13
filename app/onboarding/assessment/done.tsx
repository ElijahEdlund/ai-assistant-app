import { View, YStack, Text, Input, Card } from 'tamagui';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useProgramStore } from '../../../lib/state/program';
import { useSubscriptionStore } from '../../../lib/state/subscription';
import { upsertProfile, resetAll } from '../../../lib/data/dataClient';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

export default function AssessmentDone() {
  const [name, setName] = useState('');
  const router = useRouter();
  const { assessment, update, clear } = useAssessmentStore();
  const { user } = useAuth();

  useDisableSwipeBack();

  const handleSeePlan = async () => {
    if (!name.trim() || !user) return;

    await update({ name: name.trim() });
    await upsertProfile({ name: name.trim() });
    router.replace('/program/loading');
  };

  const handleReset = async () => {
    if (!user) return;
    await resetAll();
    clear();
    useSubscriptionStore.setState({ subscription: null });
    useProgramStore.setState({ plan: null });
    router.replace('/onboarding/assessment/q-age');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Card elevate size="$5" bordered backgroundColor="$backgroundHover" borderColor="$borderColor" padding="$5" width="100%">
            <YStack gap="$4" alignItems="center">
              <Text fontSize="$9" fontWeight="bold" textAlign="center">
                Welcome to train.ai
              </Text>
              <Text fontSize="$4" color="$placeholderColor" textAlign="center">
                what should we call you
              </Text>
              <Input
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                backgroundColor="$background"
                borderColor="$borderColor"
                color="$color"
                placeholderTextColor="$placeholderColor"
                width="100%"
                fontSize="$5"
              />
              <CTAButton
                label="See my plan"
                onPress={handleSeePlan}
                disabled={!name.trim()}
                variant="primary"
              />
              <CTAButton
                label="Reset questionnaire"
                onPress={handleReset}
                variant="secondary"
                size="$4"
              />
            </YStack>
          </Card>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}
