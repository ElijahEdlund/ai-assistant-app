import { Button, Text } from 'tamagui';

interface CTAButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  size?: '$3' | '$4' | '$5';
  fullWidth?: boolean;
  flex?: number;
}

export function CTAButton({ 
  label, 
  onPress, 
  disabled, 
  loading,
  variant = 'primary',
  size = '$5',
  fullWidth = true,
  flex,
}: CTAButtonProps) {
  const textSize = size === '$3' ? '$4' : size === '$4' ? '$4' : '$5';

  return (
    <Button
      size={size}
      theme={variant === 'primary' ? 'active' : undefined}
      onPress={onPress}
      disabled={disabled || loading}
      width={fullWidth ? '100%' : undefined}
      backgroundColor={variant === 'secondary' ? "$backgroundHover" : undefined}
      borderColor={variant === 'secondary' ? "$borderColor" : undefined}
      opacity={disabled || loading ? 0.5 : 1}
      flex={flex}
    >
      <Text color="$color" fontSize={textSize} fontWeight="600">
        {loading ? 'Loading...' : label}
      </Text>
    </Button>
  );
}

