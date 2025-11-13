import { View, YStack, Text, XStack, Button } from 'tamagui';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const MIN_HEIGHT_FT = 3;
const MAX_HEIGHT_FT = 9;
const MIN_HEIGHT_CM = Math.round(MIN_HEIGHT_FT * 30.48); // 91
const MAX_HEIGHT_CM = Math.round(MAX_HEIGHT_FT * 30.48); // 274
const MIN_HEIGHT_IN = MIN_HEIGHT_FT * 12; // 36
const MAX_HEIGHT_IN = MAX_HEIGHT_FT * 12; // 108

export default function HeightQuestion() {
  const [unit, setUnit] = useState<'ft' | 'cm'>('ft');
  const heightsInInches = useMemo(
    () =>
      Array.from({ length: MAX_HEIGHT_IN - MIN_HEIGHT_IN + 1 }, (_, index) => MIN_HEIGHT_IN + index),
    []
  );
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  const defaultHeightInches = useMemo(() => {
    if (assessment?.height_cm) {
      const fromCm = Math.round(assessment.height_cm / 2.54);
      return Math.min(Math.max(fromCm, MIN_HEIGHT_IN), MAX_HEIGHT_IN);
    }
    return 66; // Default to 5'6"
  }, [assessment?.height_cm]);

  const [selectedHeightInches, setSelectedHeightInches] = useState(defaultHeightInches);

  useEffect(() => {
    setSelectedHeightInches((prev) => {
      if (prev === defaultHeightInches) return prev;
      return defaultHeightInches;
    });
  }, [defaultHeightInches]);

  useDisableSwipeBack();

  const handleNext = async () => {
    const normalizedHeight = Math.round(selectedHeightInches * 2.54);
    await update({ height_cm: normalizedHeight });
    router.push('/onboarding/assessment/q-gender');
  };

  const helperText =
    unit === 'ft'
      ? 'Allowed range: 3 ft 0 in – 9 ft 0 in'
      : `Allowed range: ${MIN_HEIGHT_CM} – ${MAX_HEIGHT_CM} cm`;

  const displayHeightText =
    unit === 'ft'
      ? (() => {
          const feet = Math.floor(selectedHeightInches / 12);
          const inches = selectedHeightInches % 12;
          return `${feet} ft ${inches} in`;
        })()
      : `${Math.round(selectedHeightInches * 2.54)} cm`;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={3} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What's your height?
          </Text>
          <XStack gap="$2" justifyContent="center" marginBottom="$4">
            <Button
              size="$3"
              onPress={() => {
                setUnit('ft');
              }}
              backgroundColor={unit === 'ft' ? '$backgroundFocus' : '$backgroundHover'}
              borderColor="$borderColor"
            >
              <Text color="$color">ft/in</Text>
            </Button>
            <Button
              size="$3"
              onPress={() => {
                setUnit('cm');
              }}
              backgroundColor={unit === 'cm' ? '$backgroundFocus' : '$backgroundHover'}
              borderColor="$borderColor"
            >
              <Text color="$color">cm</Text>
            </Button>
          </XStack>
          <View
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$backgroundHover"
          >
            <Picker
              selectedValue={selectedHeightInches}
              onValueChange={(value) => setSelectedHeightInches(Number(value))}
              itemStyle={{ fontSize: 28 }}
            >
              {heightsInInches.map((heightInInches) => {
                const feet = Math.floor(heightInInches / 12);
                const inches = heightInInches % 12;
                const label =
                  unit === 'ft'
                    ? `${feet} ft ${inches} in`
                    : `${Math.round(heightInInches * 2.54)} cm`;
                return <Picker.Item key={heightInInches} label={label} value={heightInInches} />;
              })}
            </Picker>
          </View>
          <Text fontSize="$6" fontWeight="600" textAlign="center">
            {displayHeightText}
          </Text>
          <Text fontSize="$3" color="$placeholderColor" textAlign="center">
            {helperText}
          </Text>
          <XStack gap="$3" alignItems="center">
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
              disabled={false}
              flex={1}
              fullWidth={false}
            />
          </XStack>
        </YStack>
      </View>
    </TouchableWithoutFeedback>
  );
}

