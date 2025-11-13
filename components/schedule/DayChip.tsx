import { GestureResponderEvent, TouchableOpacity } from 'react-native';
import { YStack, Text, XStack } from 'tamagui';

export interface DayChipProps {
  date: string;
  label: string;
  dayOfMonth: string;
  isSelected: boolean;
  isToday: boolean;
  hasWorkout: boolean;
  tag?: string;
  preview?: string;
  onPress: (date: string) => void;
}

export function DayChip({
  date,
  label,
  dayOfMonth,
  isSelected,
  isToday,
  hasWorkout,
  tag,
  preview,
  onPress,
}: DayChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(date)}
      onPressIn={(event: GestureResponderEvent) => {
        event.stopPropagation();
      }}
    >
      <YStack
        padding="$3"
        marginRight="$3"
        width={96}
        borderRadius="$4"
        borderWidth={1}
        borderColor={isSelected ? '#7AF0B3' : '$borderColor'}
        backgroundColor={isSelected ? '#143024' : '$backgroundHover'}
        gap="$2"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$3" color={isSelected ? '#7AF0B3' : '$placeholderColor'}>
            {label}
          </Text>
          <Text fontSize="$3" color={isToday ? '#7AF0B3' : '$placeholderColor'}>
            {dayOfMonth}
          </Text>
        </XStack>

        {hasWorkout ? (
          <YStack gap="$1">
            {!!tag && (
              <Text fontSize="$2" color={isSelected ? '#7AF0B3' : '$placeholderColor'}>
                {tag}
              </Text>
            )}
            {!!preview && (
              <Text fontSize="$3" numberOfLines={1} color="$color">
                {preview}
              </Text>
            )}
          </YStack>
        ) : (
          <Text fontSize="$3" color="$placeholderColor">
            Rest
          </Text>
        )}
      </YStack>
    </TouchableOpacity>
  );
}

