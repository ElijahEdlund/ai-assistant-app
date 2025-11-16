import { ReactNode } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { YStack, Text, Card, Button, Input } from 'tamagui';

interface ExerciseTutorial {
  howTo: string;
  cues: string[];
  commonMistakes: string[];
}

interface Exercise {
  name: string;
  sets?: number;
  reps?: number | string;
  rest?: string;
  notes?: string;
  equipment?: string;
  tutorial?: ExerciseTutorial;
}

interface WorkoutDetailProps {
  title: string;
  tag?: string;
  exercises: Exercise[];
  completed: boolean;
  note: string;
  onToggleComplete: () => void;
  onChangeNote: (value: string) => void;
  onSaveNote: () => void;
  onExercisePress?: (exercise: Exercise) => void;
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
  onExercisePress,
  footer,
}: WorkoutDetailProps) {
  const ExerciseCard = ({ exercise, index }: { exercise: Exercise; index: number }) => {
    const content = (
      <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
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
            {exercise.equipment && (
              <Text fontSize="$3" color="$placeholderColor">
                Equipment: {exercise.equipment}
              </Text>
            )}
            {exercise.tutorial?.howTo && (
              <Text fontSize="$3" color="$placeholderColor" numberOfLines={2}>
                {exercise.tutorial.howTo}
              </Text>
            )}
            {onExercisePress && exercise.tutorial && (
              <Text fontSize="$3" color="#7AF0B3" marginTop="$2">
                Tap for full instructions →
              </Text>
            )}
          </YStack>
        </Card.Header>
      </Card>
    );

    if (onExercisePress && exercise.tutorial) {
      return (
        <TouchableOpacity key={index} onPress={() => onExercisePress(exercise)} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View key={index}>{content}</View>;
  };

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
            <ExerciseCard key={idx} exercise={exercise} index={idx} />
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

