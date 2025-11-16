import { ScrollView } from 'react-native';
import { YStack, Text, Card } from 'tamagui';

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
  equipment?: string;
  tutorial?: ExerciseTutorial;
}

interface ExerciseDetailProps {
  exercise: Exercise;
}

export function ExerciseDetail({ exercise }: ExerciseDetailProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <YStack gap="$4">
        <YStack gap="$2">
          <Text fontSize="$9" fontWeight="800" color="$color">
            {exercise.name}
          </Text>
          <Text fontSize="$4" color="$placeholderColor">
            {exercise.sets ? `${exercise.sets} sets` : ''}{' '}
            {exercise.reps ? `× ${exercise.reps} reps` : ''}
            {exercise.rest ? ` • Rest ${exercise.rest}` : ''}
          </Text>
          {exercise.equipment && (
            <Text fontSize="$4" color="$placeholderColor">
              Equipment: {exercise.equipment}
            </Text>
          )}
        </YStack>

        {exercise.tutorial?.howTo && (
          <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
            <Card.Header padded>
              <YStack gap="$3">
                <Text fontSize="$6" fontWeight="600">
                  How to Perform
                </Text>
                <Text fontSize="$4" color="$color" lineHeight="$1">
                  {exercise.tutorial.howTo}
                </Text>
              </YStack>
            </Card.Header>
          </Card>
        )}

        {exercise.tutorial?.cues && exercise.tutorial.cues.length > 0 && (
          <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
            <Card.Header padded>
              <YStack gap="$3">
                <Text fontSize="$6" fontWeight="600">
                  Coaching Cues
                </Text>
                <YStack gap="$2">
                  {exercise.tutorial.cues.map((cue, idx) => (
                    <Text key={idx} fontSize="$4" color="$color">
                      • {cue}
                    </Text>
                  ))}
                </YStack>
              </YStack>
            </Card.Header>
          </Card>
        )}

        {exercise.tutorial?.commonMistakes && exercise.tutorial.commonMistakes.length > 0 && (
          <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
            <Card.Header padded>
              <YStack gap="$3">
                <Text fontSize="$6" fontWeight="600">
                  Common Mistakes to Avoid
                </Text>
                <YStack gap="$2">
                  {exercise.tutorial.commonMistakes.map((mistake, idx) => (
                    <Text key={idx} fontSize="$4" color="$color">
                      • {mistake}
                    </Text>
                  ))}
                </YStack>
              </YStack>
            </Card.Header>
          </Card>
        )}
      </YStack>
    </ScrollView>
  );
}

