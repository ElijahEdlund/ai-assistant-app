import { create } from 'zustand';
import { getAssessment, setAssessment, Assessment } from '../data/dataClient';

interface AssessmentState {
  assessment: Assessment | null;
  loading: boolean;
  load: () => Promise<void>;
  update: (updates: Partial<Assessment>) => Promise<void>;
  clear: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessment: null,
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const assessment = await getAssessment();
      set({ assessment });
    } catch (error) {
      console.error('Error loading assessment:', error);
    } finally {
      set({ loading: false });
    }
  },
  update: async (updates: Partial<Assessment>) => {
    const current = get().assessment;
    const merged = current ? { ...current, ...updates } : updates;
    try {
      await setAssessment(merged);
      set({ assessment: merged as Assessment });
    } catch (error) {
      console.error('Error updating assessment:', error);
    }
  },
  clear: () => set({ assessment: null }),
}));

