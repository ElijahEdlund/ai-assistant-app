import { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { YStack, Text, Card, Button, Input } from 'tamagui';

interface WorkoutDetailProps {
  title: string;
  tag?: string;
  exercises: Array<{ name: string; sets?: number; reps?: number; rest?: string; notes?: string }>;
  completed: boolean;
  note: string;
  onToggleComplete: () => void;
  onChangeNote: (value: string) => void;
  onSaveNote: () => void;
  footer?: ReactNode;
}

export function WorkoutDetail({
  title,
  tag,
  exercises,
  completed,
  note,
  onToggleComplete,
  onChangeNote,
  onSaveNote,
  footer,
}: WorkoutDetailProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <YStack gap="$5">
        <YStack gap="$2">
          {tag && (
            <Text fontSize="$3" color="$placeholderColor">
              {tag}
            </Text>
          )}
          <Text fontSize="$9" fontWeight="800" color="$color">
            {title}
          </Text>
          {completed && (
            <Text fontSize="$3" color="#7AF0B3">
              Completed
            </Text>
          )}
        </YStack>

        <YStack gap="$3">
          {exercises.map((exercise, idx) => (
            <Card key={idx} size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
              <Card.Header padded>
                <YStack gap="$2">
                  <Text fontSize="$6" fontWeight="600">
                    {exercise.name}
                  </Text>
                  <Text fontSize="$4" color="$placeholderColor">
                    {exercise.sets ? `${exercise.sets} sets` : ''}{' '}
                    {exercise.reps ? `× ${exercise.reps} reps` : ''}
                    {exercise.rest ? ` • Rest ${exercise.rest}` : ''}
                  </Text>
                  {exercise.notes && (
                    <Text fontSize="$3" color="$placeholderColor">
                      {exercise.notes}
                    </Text>
                  )}
                </YStack>
              </Card.Header>
            </Card>
          ))}
        </YStack>

        <YStack gap="$3">
          <Button
            size="$5"
            theme={completed ? 'alt1' : 'active'}
            backgroundColor={completed ? '#143024' : undefined}
            borderColor={completed ? '#2b6345' : undefined}
            onPress={onToggleComplete}
          >
            <Text color="$color" fontSize="$5" fontWeight="600">
              {completed ? 'Mark as incomplete' : 'Mark complete'}
            </Text>
          </Button>

          <YStack gap="$2">
            <Text fontSize="$4" fontWeight="600">
              Notes
            </Text>
            <Input
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={onChangeNote}
              placeholder="How did it feel? Any adjustments?"
              backgroundColor="$backgroundHover"
              borderColor="$borderColor"
              color="$color"
              textAlignVertical="top"
            />
            <Button size="$4" theme="active" onPress={onSaveNote}>
              <Text color="$color" fontSize="$4" fontWeight="600">
                Save note
              </Text>
            </Button>
          </YStack>
        </YStack>

        {footer}
      </YStack>
    </ScrollView>
  );
}

