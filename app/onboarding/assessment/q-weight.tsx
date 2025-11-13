import { View, YStack, Text, XStack, Button } from 'tamagui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { Stepper } from '../../../components/ui/Stepper';
import { CTAButton } from '../../../components/ui/CTAButton';
import { useAssessmentStore } from '../../../lib/state/assessment';
import { useDisableSwipeBack } from '../../../lib/gestures/swipeBack';
import { Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const MIN_WEIGHT_LB = 80;
const MAX_WEIGHT_LB = 500;
const MIN_WEIGHT_KG = Number((MIN_WEIGHT_LB * 0.453592).toFixed(1)); // ≈ 36.3
const MAX_WEIGHT_KG = Number((MAX_WEIGHT_LB * 0.453592).toFixed(1)); // ≈ 226.8

export default function WeightQuestion() {
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  const weights = useMemo(
    () =>
      Array.from({ length: MAX_WEIGHT_LB - MIN_WEIGHT_LB + 1 }, (_, index) => MIN_WEIGHT_LB + index),
    []
  );

  const defaultWeightLb = useMemo(() => {
    if (assessment?.weight_kg) {
      const fromKg = Math.round(assessment.weight_kg / 0.453592);
      return Math.min(Math.max(fromKg, MIN_WEIGHT_LB), MAX_WEIGHT_LB);
    }
    return 180;
  }, [assessment]);

  const [selectedWeightLb, setSelectedWeightLb] = useState(defaultWeightLb);

  useEffect(() => {
    setSelectedWeightLb((prev) => {
      if (prev === defaultWeightLb) return prev;
      return defaultWeightLb;
    });
  }, [defaultWeightLb]);

  const handleWeightChange = useCallback((value: number) => {
    setSelectedWeightLb(value);
  }, []);

  const handleNext = async () => {
    const normalizedKg = Number((selectedWeightLb * 0.453592).toFixed(1));
    await update({ weight_kg: normalizedKg });
    router.push('/onboarding/assessment/q-height');
  };

  const helperText =
    unit === 'lb'
      ? 'Allowed range: 80 – 500 lb'
      : `Allowed range: ${MIN_WEIGHT_KG} – ${MAX_WEIGHT_KG} kg`;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={2} total={9} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            What's your weight?
          </Text>
          <XStack gap="$2" justifyContent="center" marginBottom="$4">
            <Button
              size="$3"
              onPress={() => {
                setUnit('lb');
              }}
              backgroundColor={unit === 'lb' ? '$backgroundFocus' : '$backgroundHover'}
              borderColor="$borderColor"
            >
              <Text color="$color">lb</Text>
            </Button>
            <Button
              size="$3"
              onPress={() => {
                setUnit('kg');
              }}
              backgroundColor={unit === 'kg' ? '$backgroundFocus' : '$backgroundHover'}
              borderColor="$borderColor"
            >
              <Text color="$color">kg</Text>
            </Button>
          </XStack>
          <View
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$backgroundHover"
          >
            <Picker
              selectedValue={selectedWeightLb}
              onValueChange={handleWeightChange}
              itemStyle={{ fontSize: 28 }}
            >
              {weights.map((weightOption) => {
                const label =
                  unit === 'lb'
                    ? `${weightOption} lb`
                    : `${(weightOption * 0.453592).toFixed(1)} kg`;
                return <Picker.Item key={weightOption} label={label} value={weightOption} />;
              })}
            </Picker>
          </View>
          <Text fontSize="$6" fontWeight="600" textAlign="center">
            {unit === 'lb'
              ? `${selectedWeightLb} lb`
              : `${(selectedWeightLb * 0.453592).toFixed(1)} kg`}
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

