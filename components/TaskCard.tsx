import { Card, Text, XStack, YStack, Button } from 'tamagui';

export interface TaskCardProps {
  title: string;
  description?: string;
  status: 'todo' | 'doing' | 'done';
  onStart?: () => void;
}

export function TaskCard({ title, description, status, onStart }: TaskCardProps) {
  return (
    <Card
      elevate
      size="$4"
      bordered
      backgroundColor="$backgroundHover"
      borderColor="$borderColor"
    >
      <Card.Header padded>
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600" color="$color">
            {title}
          </Text>
          {description && (
            <Text fontSize="$3" color="$placeholderColor">
              {description}
            </Text>
          )}
          {status === 'todo' && onStart && (
            <Button
              size="$4"
              theme="active"
              onPress={onStart}
              marginTop="$2"
            >
              Start
            </Button>
          )}
          {status === 'doing' && (
            <Text fontSize="$2" color="$placeholderColor" marginTop="$2">
              In Progress...
            </Text>
          )}
        </YStack>
      </Card.Header>
    </Card>
  );
}

