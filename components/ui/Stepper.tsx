import { XStack, Text, View } from 'tamagui';

interface StepperProps {
  current: number;
  total: number;
}

export function Stepper({ current, total }: StepperProps) {
  return (
    <XStack 
      justifyContent="space-between" 
      alignItems="center" 
      paddingHorizontal="$4" 
      paddingVertical="$3"
      marginTop="$6"
    >
      <Text fontSize="$3" color="$placeholderColor">
        Step {current} of {total}
      </Text>
      <XStack gap="$2">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={i < current ? "$color" : "$placeholderColor"}
          />
        ))}
      </XStack>
    </XStack>
  );
}

