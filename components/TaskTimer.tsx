import { useEffect, useState } from 'react';
import { YStack, Text, Button, XStack } from 'tamagui';
import { Task } from '../lib/schemas';

export interface TaskTimerProps {
  task: Task;
  durationMinutes: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function TaskTimer({ task, durationMinutes, onComplete, onCancel }: TaskTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) {
      if (secondsRemaining <= 0) {
        onComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining, onComplete]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <YStack gap="$4" padding="$4" backgroundColor="$backgroundHover" borderRadius="$4">
      <Text fontSize="$6" fontWeight="600">
        {task.title}
      </Text>
      <Text fontSize="$10" fontWeight="bold" textAlign="center">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>
      <XStack gap="$3">
        <Button flex={1} onPress={onCancel} variant="outlined" borderColor="$borderColor">
          Cancel
        </Button>
        <Button flex={1} onPress={() => setIsRunning(!isRunning)} theme="active">
          {isRunning ? 'Pause' : 'Resume'}
        </Button>
      </XStack>
    </YStack>
  );
}

