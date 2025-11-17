import { View, Text } from 'react-native';

interface AthletIQLogoProps {
  size?: number;
}

export function AthletIQLogo({ size = 120 }: AthletIQLogoProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        backgroundColor: '#000000', // Black background
        width: '100%',
        paddingVertical: 20,
      }}
    >
      <Text
        style={{
          fontSize: size * 0.35,
          fontWeight: 'bold',
          color: '#7AF0B3', // Neon green text
          letterSpacing: 1,
        }}
      >
        AthletIQ
      </Text>
    </View>
  );
}

