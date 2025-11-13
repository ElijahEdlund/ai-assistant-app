import { useRef } from 'react';
import { ScrollView } from 'react-native';
import { XStack, Button } from 'tamagui';
import { DayChip } from './DayChip';
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
import { WeekDaySummary } from '../../lib/program/selectors';

interface WeekStripProps {
  days: WeekDaySummary[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

export function WeekStrip({ days, selectedDate, onSelect, onPrevWeek, onNextWeek }: WeekStripProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  return (
    <XStack alignItems="center" gap="$3">
      <Button
        size="$3"
        circular
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
        icon={ChevronLeft}
        onPress={onPrevWeek}
      />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
      >
        <XStack>
          {days.map((day) => (
            <DayChip
              key={day.date}
              date={day.date}
              label={day.label}
              dayOfMonth={day.dayOfMonth}
              isSelected={selectedDate === day.date}
              isToday={day.isToday}
              hasWorkout={day.workouts.length > 0}
              tag={day.workouts[0]?.tag}
              preview={day.workouts[0]?.preview}
              onPress={onSelect}
            />
          ))}
        </XStack>
      </ScrollView>
      <Button
        size="$3"
        circular
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
        icon={ChevronRight}
        onPress={onNextWeek}
      />
    </XStack>
  );
}

