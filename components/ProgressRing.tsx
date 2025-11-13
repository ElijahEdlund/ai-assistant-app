import { View } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { Text } from 'tamagui';

export interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
}

export function ProgressRing({ progress, size = 60, strokeWidth = 6 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#333333"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text fontSize="$4" fontWeight="600">
          {Math.round(progress * 100)}%
        </Text>
      </View>
    </View>
  );
}

