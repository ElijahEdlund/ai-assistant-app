import { create } from 'zustand';
import { getSubscription, setSubscription, Subscription } from '../data/dataClient';

interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  load: () => Promise<void>;
  save: (sub: Subscription) => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscription: null,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const sub = await getSubscription();
      set({ subscription: sub });
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      set({ loading: false });
    }
  },
  save: async (sub: Subscription) => {
    try {
      await setSubscription(sub);
      set({ subscription: sub });
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  },
}));

