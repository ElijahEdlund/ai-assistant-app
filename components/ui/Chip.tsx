import { Button, Text } from 'tamagui';
import { Pressable } from 'react-native';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Button
        size="$3"
        circular={false}
        backgroundColor={selected ? "$backgroundFocus" : "$backgroundHover"}
        borderColor={selected ? "$borderColorFocus" : "$borderColor"}
        borderWidth={1}
        onPress={onPress}
        disabled={disabled}
        opacity={disabled ? 0.5 : 1}
      >
        <Text color="$color" fontSize="$4" fontWeight={selected ? "600" : "400"}>
          {label}
        </Text>
      </Button>
    </Pressable>
  );
}

