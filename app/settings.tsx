import { View, YStack, Text, XStack, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../lib/state/theme';
import { Switch as RNSwitch } from 'react-native';
import { startTransition, useCallback } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const isDark = theme === 'dark';

  const handleToggle = useCallback(
    (checked: boolean) => {
      const next = checked ? 'dark' : 'light';
      startTransition(() => {
        setTheme(next);
      });
    },
    [setTheme]
  );

  return (
    <View flex={1} backgroundColor="$background">
      <YStack flex={1} padding="$4" gap="$4">
        <Button
          size="$3"
          theme="alt1"
          alignSelf="flex-start"
          onPress={() => router.back()}
        >
          Back
        </Button>
        <Text fontSize="$9" fontWeight="bold" textAlign="center">
          Settings
        </Text>

        <YStack gap="$4" marginTop="$6">
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize="$5" fontWeight="600">
              Dark mode
            </Text>
            <RNSwitch
              value={isDark}
              onValueChange={handleToggle}
              trackColor={{ false: '#bdbdbd', true: '#4caf50' }}
              thumbColor="#f4f3f4"
              ios_backgroundColor="#bdbdbd"
            />
          </XStack>
        </YStack>
      </YStack>
    </View>
  );
}


