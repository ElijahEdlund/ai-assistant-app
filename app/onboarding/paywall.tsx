import { View, YStack, Text, XStack, Card } from 'tamagui';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { CTAButton } from '../../components/ui/CTAButton';
import { useSubscriptionStore } from '../../lib/state/subscription';
import { Subscription } from '../../lib/data/dataClient';
import { useDisableSwipeBack } from '../../lib/gestures/swipeBack';

type PlanType = 'trial' | 'monthly' | 'quarterly' | 'semiannual';

const plans: Array<{ type: PlanType; label: string; price: string; period: string }> = [
  { type: 'trial', label: 'Trial', price: 'Free', period: '7 days' },
  { type: 'monthly', label: 'Monthly', price: '$19.99', period: 'per month' },
  { type: 'quarterly', label: '3-Month', price: '$49.99', period: 'per 3 months' },
  { type: 'semiannual', label: '6-Month', price: '$89.99', period: 'per 6 months' },
];

function isoPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
  const router = useRouter();
  const { save } = useSubscriptionStore();
  useDisableSwipeBack();

  const handleContinue = async () => {
    const renewsDays = selectedPlan === 'trial' ? 7 : 
                      selectedPlan === 'monthly' ? 30 :
                      selectedPlan === 'quarterly' ? 90 : 180;

    const subscription: Subscription = {
      user_id: '', // Will be set by dataClient
      plan: selectedPlan,
      started_at: new Date().toISOString(),
      renews_at: isoPlusDays(renewsDays),
      status: 'active',
    };

    await save(subscription);
    router.replace('/onboarding/assessment');
  };

  return (
    <View flex={1} backgroundColor="$background">
      <YStack flex={1} padding="$4" gap="$4" justifyContent="center">
        <Text fontSize="$9" fontWeight="bold" textAlign="center" marginBottom="$2">
          Start your 7-day free trial
        </Text>
        <Text fontSize="$4" color="$placeholderColor" textAlign="center" marginBottom="$6">
          Cancel anytime
        </Text>

        <YStack gap="$3">
          {plans.map((plan) => (
            <Card
              key={plan.type}
              elevate
              size="$4"
              bordered
              backgroundColor={selectedPlan === plan.type ? "$backgroundFocus" : "$backgroundHover"}
              borderColor={selectedPlan === plan.type ? "$borderColorFocus" : "$borderColor"}
              onPress={() => setSelectedPlan(plan.type)}
              pressStyle={{ scale: 0.98 }}
            >
              <Card.Header padded>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$6" fontWeight="600">
                      {plan.label}
                    </Text>
                    <XStack gap="$2" alignItems="center">
                      <Text fontSize="$7" fontWeight="bold">
                        {plan.price}
                      </Text>
                      <Text fontSize="$3" color="$placeholderColor">
                        {plan.period}
                      </Text>
                    </XStack>
                  </YStack>
                  {selectedPlan === plan.type && (
                    <View
                      width={24}
                      height={24}
                      borderRadius={12}
                      backgroundColor="$color"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text color="$background" fontSize="$3">✓</Text>
                    </View>
                  )}
                </XStack>
                <Text fontSize="$2" color="$placeholderColor" marginTop="$2">
                  7-day free trial — cancel anytime
                </Text>
              </Card.Header>
            </Card>
          ))}
        </YStack>

        <CTAButton
          label="Continue"
          onPress={handleContinue}
          variant="primary"
        />
      </YStack>
    </View>
  );
}

