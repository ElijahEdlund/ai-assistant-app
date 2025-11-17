import { View, Text } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { Card, YStack, XStack } from 'tamagui';

interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  notes?: string;
}

interface MacroPieChartProps {
  targets: MacroTargets;
}

export function MacroPieChart({ targets }: MacroPieChartProps) {
  const { calories, proteinGrams, carbsGrams, fatsGrams } = targets;

  // Calculate calories from macros (1g protein = 4 cal, 1g carbs = 4 cal, 1g fat = 9 cal)
  const proteinCalories = proteinGrams * 4;
  const carbsCalories = carbsGrams * 4;
  const fatsCalories = fatsGrams * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatsCalories;

  // Calculate percentages
  const proteinPercent = totalMacroCalories > 0 ? proteinCalories / totalMacroCalories : 0;
  const carbsPercent = totalMacroCalories > 0 ? carbsCalories / totalMacroCalories : 0;
  const fatsPercent = totalMacroCalories > 0 ? fatsCalories / totalMacroCalories : 0;

  // Pie chart configuration
  const size = 200;
  const radius = 70;
  const centerX = size / 2;
  const centerY = size / 2;

  // Helper function to create pie slice path
  const createPieSlice = (startAngle: number, endAngle: number) => {
    const start = ((startAngle - 90) * Math.PI) / 180;
    const end = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  // Calculate label positions
  const getLabelPosition = (startAngle: number, endAngle: number) => {
    const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
    const labelRadius = radius * 0.6;
    return {
      x: centerX + labelRadius * Math.cos(midAngle),
      y: centerY + labelRadius * Math.sin(midAngle),
    };
  };

  // Calculate angles for each macro
  let currentAngle = 0;
  const proteinStart = currentAngle;
  const proteinEnd = currentAngle + proteinPercent * 360;
  const proteinLabelPos = getLabelPosition(proteinStart, proteinEnd);

  currentAngle = proteinEnd;
  const carbsStart = currentAngle;
  const carbsEnd = currentAngle + carbsPercent * 360;
  const carbsLabelPos = getLabelPosition(carbsStart, carbsEnd);

  currentAngle = carbsEnd;
  const fatsStart = currentAngle;
  const fatsEnd = currentAngle + fatsPercent * 360;
  const fatsLabelPos = getLabelPosition(fatsStart, fatsEnd);

  return (
    <Card size="$4" bordered backgroundColor="$backgroundHover" borderColor="$borderColor">
      <Card.Header padded>
        <YStack gap="$4" alignItems="center">
          <Text fontSize="$6" fontWeight="bold" textAlign="center">
            Daily Macro Targets
          </Text>
          
          <Text fontSize="$8" fontWeight="800" color="#7AF0B3" textAlign="center">
            {calories.toLocaleString()} cal
          </Text>

          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              {/* Protein slice */}
              {proteinPercent > 0 && (
                <G>
                  <Path
                    d={createPieSlice(proteinStart, proteinEnd)}
                    fill="#FF6B6B"
                  />
                  <SvgText
                    x={proteinLabelPos.x}
                    y={proteinLabelPos.y}
                    fontSize="14"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    P
                  </SvgText>
                </G>
              )}

              {/* Carbs slice */}
              {carbsPercent > 0 && (
                <G>
                  <Path
                    d={createPieSlice(carbsStart, carbsEnd)}
                    fill="#4ECDC4"
                  />
                  <SvgText
                    x={carbsLabelPos.x}
                    y={carbsLabelPos.y}
                    fontSize="14"
                    fill="#FFFFFF"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    C
                  </SvgText>
                </G>
              )}

              {/* Fats slice */}
              {fatsPercent > 0 && (
                <G>
                  <Path
                    d={createPieSlice(fatsStart, fatsEnd)}
                    fill="#FFD93D"
                  />
                  <SvgText
                    x={fatsLabelPos.x}
                    y={fatsLabelPos.y}
                    fontSize="14"
                    fill="#000000"
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    F
                  </SvgText>
                </G>
              )}
            </Svg>
          </View>

          {/* Legend */}
          <YStack gap="$2" width="100%">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#FF6B6B',
                  }}
                />
                <Text fontSize="$4" color="$color">
                  Protein
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="600" color="$color">
                {proteinGrams}g ({Math.round(proteinPercent * 100)}%)
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#4ECDC4',
                  }}
                />
                <Text fontSize="$4" color="$color">
                  Carbs
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="600" color="$color">
                {carbsGrams}g ({Math.round(carbsPercent * 100)}%)
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <XStack gap="$2" alignItems="center">
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#FFD93D',
                  }}
                />
                <Text fontSize="$4" color="$color">
                  Fats
                </Text>
              </XStack>
              <Text fontSize="$4" fontWeight="600" color="$color">
                {fatsGrams}g ({Math.round(fatsPercent * 100)}%)
              </Text>
            </XStack>
          </YStack>

          {targets.notes && (
            <Text fontSize="$3" color="$placeholderColor" textAlign="center" marginTop="$2">
              {targets.notes}
            </Text>
          )}
        </YStack>
      </Card.Header>
    </Card>
  );
}

