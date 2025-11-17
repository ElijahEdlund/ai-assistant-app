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

const MIN_HOURS = 0.5; // 30 minutes
const MAX_HOURS = 4;
const INCREMENT = 0.25; // 15-minute steps

export default function HoursQuestion() {
  const router = useRouter();
  const { assessment, update } = useAssessmentStore();

  useDisableSwipeBack();

  const hourOptions = useMemo(
    () =>
      Array.from(
        { length: Math.round((MAX_HOURS - MIN_HOURS) / INCREMENT) + 1 },
        (_, index) => Number((MIN_HOURS + index * INCREMENT).toFixed(2))
      ),
    []
  );

  const defaultHours = useMemo(() => {
    if (assessment?.daily_minutes) {
      const hours = assessment.daily_minutes / 60;
      const clamped = Math.min(Math.max(hours, MIN_HOURS), MAX_HOURS);
      const roundedToIncrement = Math.round((clamped - MIN_HOURS) / INCREMENT) * INCREMENT + MIN_HOURS;
      return Number(roundedToIncrement.toFixed(2));
    }
    return 1.5;
  }, [assessment?.daily_minutes]);

  const [selectedHours, setSelectedHours] = useState(defaultHours);

  useEffect(() => {
    setSelectedHours((prev) => {
      if (prev === defaultHours) return prev;
      return defaultHours;
    });
  }, [defaultHours]);

  const handleNext = async () => {
    const minutes = Math.round(selectedHours * 60);
    await update({ daily_minutes: minutes });
    router.push('/onboarding/assessment/done');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View flex={1} backgroundColor="$background">
        <Stepper current={13} total={13} />
        <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
          <Text fontSize="$8" fontWeight="bold" textAlign="center" marginBottom="$4">
            How many hours per day can you work out?
          </Text>
          <View
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$backgroundHover"
          >
            <Picker
              selectedValue={selectedHours}
              onValueChange={(value) => setSelectedHours(Number(value))}
              itemStyle={{ fontSize: 28 }}
            >
              {hourOptions.map((value) => {
                const hours = Math.floor(value);
                const minutes = Math.round((value - hours) * 60);
                const label =
                  minutes === 0 ? `${hours} hr${hours === 1 ? '' : 's'}` : `${hours} hr ${minutes} min`;
                return <Picker.Item key={value} label={label} value={value} />;
              })}
            </Picker>
          </View>
          <Text fontSize="$6" fontWeight="600" textAlign="center">
            {(() => {
              const hours = Math.floor(selectedHours);
              const minutes = Math.round((selectedHours - hours) * 60);
              if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
              return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min`;
            })()}
          </Text>
          <Text fontSize="$3" color="$placeholderColor" textAlign="center">
            Minimum 0.5 hours (30 minutes), maximum 4.0 hours.
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


