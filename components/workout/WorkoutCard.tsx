import { Card, YStack, Text, Button } from 'tamagui';
import { ReactNode } from 'react';

interface WorkoutCardProps {
  title: string;
  tag?: string;
  exercises: Array<{ name: string; sets?: number; reps?: number | string; rest?: string }>;
  onPress?: () => void;
  footer?: ReactNode;
  CTA?: {
    label: string;
    onPress: () => void;
  };
  completed?: boolean;
}

export function WorkoutCard({ title, tag, exercises, onPress, footer, CTA, completed }: WorkoutCardProps) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      backgroundColor="$backgroundHover"
      borderColor={completed ? '#2b6345' : '$borderColor'}
      onPress={onPress}
    >
      <Card.Header padded>
        <YStack gap="$3">
          <YStack gap="$1">
            {tag && (
              <Text fontSize="$3" color="$placeholderColor">
                {tag}
              </Text>
            )}
            <Text fontSize="$6" fontWeight="700" color="$color">
              {title}
            </Text>
            {completed && (
              <Text fontSize="$2" color="#7AF0B3">
                Completed
              </Text>
            )}
          </YStack>
          <YStack gap="$2">
            {exercises.slice(0, 3).map((exercise, index) => (
              <Text key={index} fontSize="$4" color="$placeholderColor">
                • {exercise.name}
                {exercise.sets ? ` · ${exercise.sets} × ${exercise.reps ?? '-'} reps` : ''}
              </Text>
            ))}
            {exercises.length > 3 && (
              <Text fontSize="$3" color="$placeholderColor">
                +{exercises.length - 3} more
              </Text>
            )}
          </YStack>
          {footer}
          {CTA && (
            <Button size="$4" theme="active" onPress={CTA.onPress}>
              <Text color="$color" fontSize="$4" fontWeight="600">
                {CTA.label}
              </Text>
            </Button>
          )}
        </YStack>
      </Card.Header>
    </Card>
  );
}

