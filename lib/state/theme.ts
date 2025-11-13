import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppTheme = 'light' | 'dark';

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) =>
        set((state) => (state.theme === theme ? state : { theme })),
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
      },
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


