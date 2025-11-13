// Entitlements abstraction layer
// Can be swapped with RevenueCat later

export type Plan = 'free' | 'pro';

export interface Entitlements {
  plan: Plan;
  activeGoalsLimit: number | null; // null = unlimited
  pushNotifications: boolean;
  aiRebalance: boolean;
  coachHints: boolean;
}

// TODO: Replace with RevenueCat check
export async function getEntitlements(userId: string): Promise<Entitlements> {
  // Placeholder: Check user_prefs or a subscription table
  // For now, return free plan
  return {
    plan: 'free',
    activeGoalsLimit: 1,
    pushNotifications: false,
    aiRebalance: false,
    coachHints: true, // Free users get basic hints
  };

  // Future RevenueCat integration:
  // const customerInfo = await Purchases.getCustomerInfo();
  // return {
  //   plan: customerInfo.entitlements.active['pro'] ? 'pro' : 'free',
  //   activeGoalsLimit: customerInfo.entitlements.active['pro'] ? null : 1,
  //   pushNotifications: customerInfo.entitlements.active['pro'],
  //   aiRebalance: customerInfo.entitlements.active['pro'],
  //   coachHints: true,
  // };
}

export async function checkCanCreateGoal(userId: string): Promise<boolean> {
  const entitlements = await getEntitlements(userId);
  
  if (entitlements.activeGoalsLimit === null) {
    return true; // Unlimited
  }

  // Check current active goals count
  const { goals } = await import('./supabase');
  const userGoals = await goals.getByUserId(userId);
  const activeGoals = userGoals.filter((g) => g.status === 'active');
  
  return activeGoals.length < entitlements.activeGoalsLimit;
}

