import { useState } from 'react';
import { YStack, Text, Button, Sheet, Input, XStack } from 'tamagui';
import { Task } from '../lib/schemas';

export type CompletionAction = 'completed' | 'snooze' | 'partial';

export interface TaskCompletionModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onAction: (action: CompletionAction, note?: string) => Promise<void>;
}

export function TaskCompletionModal({
  open,
  task,
  onClose,
  onAction,
}: TaskCompletionModalProps) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const handleAction = async (action: CompletionAction) => {
    if (action === 'partial' && !showNoteInput) {
      setShowNoteInput(true);
      return;
    }

    setLoading(true);
    try {
      await onAction(action, note || undefined);
      setNote('');
      setShowNoteInput(false);
      onClose();
    } catch (error) {
      console.error('Error handling task action:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Sheet modal open={open} onOpenChange={onClose} snapPoints={[50]} dismissOnSnapToBottom>
      <Sheet.Overlay />
      <Sheet.Handle />
      <Sheet.Frame backgroundColor="$background" padding="$4">
        <YStack gap="$4">
          <Text fontSize="$7" fontWeight="bold">
            Task Complete?
          </Text>
          <Text fontSize="$5" color="$placeholderColor">
            {task.title}
          </Text>
          <YStack gap="$3">
            <Button
              size="$5"
              theme="active"
              onPress={() => handleAction('completed')}
              disabled={loading}
            >
              Yes, Completed
            </Button>
            <Button
              size="$4"
              variant="outlined"
              onPress={() => handleAction('snooze')}
              disabled={loading}
              borderColor="$borderColor"
            >
              Snooze (Move to Tomorrow)
            </Button>
            <Button
              size="$4"
              variant="outlined"
              onPress={() => handleAction('partial')}
              disabled={loading}
              borderColor="$borderColor"
            >
              {showNoteInput ? 'Save Partial' : 'Partial (Add Note)'}
            </Button>
            {showNoteInput && (
              <Input
                placeholder="Add a note..."
                multiline
                minHeight={80}
                value={note}
                onChangeText={setNote}
                backgroundColor="$backgroundHover"
                borderColor="$borderColor"
                color="$color"
              />
            )}
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

