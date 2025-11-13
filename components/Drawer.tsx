import { XStack, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Cog } from '@tamagui/lucide-icons';

export function Drawer() {
  const router = useRouter();

  return (
    <XStack position="absolute" top={50} left={20} zIndex={1000}>
      <Button
        size="$3"
        circular
        icon={Cog}
        onPress={() => router.push('/settings')}
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
      />
    </XStack>
  );
}

