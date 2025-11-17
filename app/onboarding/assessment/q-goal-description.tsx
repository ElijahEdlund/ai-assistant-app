import { View, YStack, Text, XStack, Button, Input } from 'tamagui';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';

const MIN_CHAR_COUNT = 15;
const MAX_CHAR_COUNT = 400;

export default function GoalDescriptionQuestion() {
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();
  const [description, setDescription] = useState(assessment?.goal_description ?? '');
  const [touched, setTouched] = useState(false);

  useDisableSwipeBack();

  useEffect(() => {
    if (!touched && assessment?.goal_description) {
      setDescription(assessment.goal_description);
    }
  }, [assessment?.goal_description, touched]);

  const trimmed = useMemo(() => description.trim(), [description]);
  const isValid = trimmed.length >= MIN_CHAR_COUNT && trimmed.length <= MAX_CHAR_COUNT;

  const helperText = useMemo(() => {
    if (!touched) return `Aim for at least ${MIN_CHAR_COUNT} characters.`;
    if (trimmed.length < MIN_CHAR_COUNT) {
      const remaining = MIN_CHAR_COUNT - trimmed.length;
      return `Add ${remaining} more character${remaining === 1 ? '' : 's'} to continue.`;
    }
    if (trimmed.length > MAX_CHAR_COUNT) {
      const over = trimmed.length - MAX_CHAR_COUNT;
      return `Shorten by ${over} character${over === 1 ? '' : 's'} to continue.`;
    }
    return `Looks good! ${trimmed.length} / ${MAX_CHAR_COUNT} characters.`;
  }, [touched, trimmed.length]);

  const handleChange = (value: string) => {
    if (!touched) setTouched(true);
    setDescription(value.slice(0, MAX_CHAR_COUNT + 5));
  };

  const handleNext = async () => {
    if (!isValid) return;
    await update({ goal_description: trimmed });
    router.push('/onboarding/assessment/q-experience');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={6} total={13} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            Give a brief description of your training goals.
          </Text>
          <Input
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholder="Share what you want to achieve..."
            value={description}
            onChangeText={handleChange}
            backgroundColor="$backgroundHover"
            borderColor="$borderColor"
            color="$color"
            placeholderTextColor="$placeholderColor"
            fontSize="$5"
            padding="$4"
            height={180}
          />
          <Text fontSize="$3" color={isValid ? '$color' : '$placeholderColor'} textAlign="center">
            {helperText}
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


