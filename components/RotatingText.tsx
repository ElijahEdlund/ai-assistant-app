import { Text, XStack } from 'tamagui';
import { useState, useEffect } from 'react';
import { Animated, View } from 'react-native';

interface RotatingTextProps {
  staticText: string;
  rotatingTexts: string[];
  fontSize?: any;
  fontWeight?: any;
  color?: string;
  interval?: number;
}

export function RotatingText({ 
  staticText, 
  rotatingTexts, 
  fontSize = '$7',
  fontWeight = 'bold',
  color = '$color',
  interval = 3000 
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity = useState(new Animated.Value(1))[0];
  const translateY = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const timer = setInterval(() => {
      // Quick fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Change text
        setCurrentIndex((prev) => (prev + 1) % rotatingTexts.length);
        // Reset position and quick fade in
        translateY.setValue(10);
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, interval);

    return () => clearInterval(timer);
  }, [rotatingTexts.length, interval, opacity, translateY]);

  const animatedStyle = {
    opacity,
    transform: [{ translateY }],
  };

  // Calculate max width to prevent layout shift - estimate based on character count
  // Using a more generous estimate to account for different character widths
  const maxWidth = Math.max(...rotatingTexts.map(text => text.length * 12));

  return (
    <XStack alignItems="center" justifyContent="center" flexWrap="wrap" gap="$2">
      <Text fontSize={fontSize} fontWeight={fontWeight} color={color}>
        {staticText}
      </Text>
      <View style={{ minWidth: maxWidth, alignItems: 'flex-start', justifyContent: 'center' }}>
        <Animated.View style={animatedStyle}>
          <Text fontSize={fontSize} fontWeight={fontWeight} color={color}>
            {rotatingTexts[currentIndex]}
          </Text>
        </Animated.View>
      </View>
    </XStack>
  );
}

