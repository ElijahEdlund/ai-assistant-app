import { useState } from 'react';
import { YStack, XStack, Text, Input, Button, Sheet, Select, Adapt, Spinner } from 'tamagui';
import { QualifyingQuestions, QualifyingQuestionsSchema } from '../lib/schemas';

export interface QualifyingQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: QualifyingQuestions) => Promise<void>;
  goalTitle: string;
}

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const TIME_WINDOW_OPTIONS = [
  { value: '06:00-09:00', label: 'Early Morning (6am-9am)' },
  { value: '09:00-12:00', label: 'Morning (9am-12pm)' },
  { value: '12:00-15:00', label: 'Afternoon (12pm-3pm)' },
  { value: '15:00-18:00', label: 'Late Afternoon (3pm-6pm)' },
  { value: '18:00-21:00', label: 'Evening (6pm-9pm)' },
];

export function QualifyingQuestionsModal({
  open,
  onClose,
  onSubmit,
  goalTitle,
}: QualifyingQuestionsModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<QualifyingQuestions>>({
    preferred_windows: [],
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validated = QualifyingQuestionsSchema.parse(formData);
      await onSubmit(validated);
      // Reset and close
      setStep(1);
      setFormData({ preferred_windows: [] });
      onClose();
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWindow = (window: string) => {
    const current = formData.preferred_windows || [];
    if (current.includes(window)) {
      setFormData({
        ...formData,
        preferred_windows: current.filter((w) => w !== window),
      });
    } else {
      setFormData({
        ...formData,
        preferred_windows: [...current, window],
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!formData.level;
      case 2:
        return !!formData.timeframe_weeks && formData.timeframe_weeks > 0;
      case 3:
        return !!formData.daily_minutes && formData.daily_minutes > 0;
      case 4:
        return (formData.preferred_windows?.length || 0) > 0;
      case 5:
        return true; // Constraints optional
      case 6:
        return true; // Review step
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              What's your experience level?
            </Text>
            {LEVEL_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onPress={() => setFormData({ ...formData, level: option.value as any })}
                backgroundColor={
                  formData.level === option.value ? '$backgroundFocus' : '$backgroundHover'
                }
                borderColor="$borderColor"
              >
                <Text>{option.label}</Text>
              </Button>
            ))}
          </YStack>
        );
      case 2:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              How many weeks do you want to commit?
            </Text>
            <Input
              placeholder="e.g., 4, 8, 12"
              keyboardType="numeric"
              value={formData.timeframe_weeks?.toString() || ''}
              onChangeText={(text) =>
                setFormData({ ...formData, timeframe_weeks: parseInt(text) || undefined })
              }
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
            />
          </YStack>
        );
      case 3:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              How many minutes per day can you dedicate?
            </Text>
            <Input
              placeholder="e.g., 30, 45, 60"
              keyboardType="numeric"
              value={formData.daily_minutes?.toString() || ''}
              onChangeText={(text) =>
                setFormData({ ...formData, daily_minutes: parseInt(text) || undefined })
              }
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
            />
          </YStack>
        );
      case 4:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              When are you typically available? (Select all that apply)
            </Text>
            {TIME_WINDOW_OPTIONS.map((option) => (
              <Button
                key={option.value}
                onPress={() => toggleWindow(option.value)}
                backgroundColor={
                  formData.preferred_windows?.includes(option.value)
                    ? '$backgroundFocus'
                    : '$backgroundHover'
                }
                borderColor="$borderColor"
              >
                <Text>{option.label}</Text>
              </Button>
            ))}
          </YStack>
        );
      case 5:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              Any constraints or preferences?
            </Text>
            <Input
              placeholder="e.g., No weekends, prefer mornings..."
              multiline
              minHeight={100}
              value={formData.constraints || ''}
              onChangeText={(text) => setFormData({ ...formData, constraints: text })}
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
            />
          </YStack>
        );
      case 6:
        return (
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="600">
              Review your plan
            </Text>
            <YStack gap="$2" padding="$3" backgroundColor="$backgroundHover" borderRadius="$4">
              <Text>Goal: {goalTitle}</Text>
              <Text>Level: {formData.level}</Text>
              <Text>Timeframe: {formData.timeframe_weeks} weeks</Text>
              <Text>Daily: {formData.daily_minutes} minutes</Text>
              <Text>Windows: {formData.preferred_windows?.join(', ')}</Text>
              {formData.constraints && <Text>Constraints: {formData.constraints}</Text>}
            </YStack>
          </YStack>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet modal open={open} onOpenChange={onClose} snapPoints={[85]} dismissOnSnapToBottom>
      <Sheet.Overlay />
      <Sheet.Handle />
      <Sheet.Frame backgroundColor="$background" padding="$4">
        <YStack flex={1} gap="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$7" fontWeight="bold">
              Step {step} of {totalSteps}
            </Text>
            {step > 1 && (
              <Button size="$3" onPress={handleBack} variant="outlined" borderColor="$borderColor">
                Back
              </Button>
            )}
          </XStack>
          {renderStep()}
          <XStack gap="$3" marginTop="auto">
            {step < totalSteps ? (
              <Button
                flex={1}
                onPress={handleNext}
                disabled={!canProceed()}
                theme="active"
              >
                Next
              </Button>
            ) : (
              <Button
                flex={1}
                onPress={handleSubmit}
                disabled={!canProceed() || loading}
                theme="active"
              >
                {loading ? <Spinner size="small" color="$color" /> : 'Generate Plan'}
              </Button>
            )}
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

