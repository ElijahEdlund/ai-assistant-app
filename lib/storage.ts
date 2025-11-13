import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@app:';

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error reading ${key} from AsyncStorage:`, error);
    return null;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to AsyncStorage:`, error);
  }
}

export async function mergeJSON<T extends Record<string, any>>(key: string, updates: Partial<T>): Promise<void> {
  try {
    const existing = await getJSON<T>(key);
    const merged = existing ? { ...existing, ...updates } : updates;
    await setJSON(key, merged);
  } catch (error) {
    console.error(`Error merging ${key} in AsyncStorage:`, error);
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.error(`Error removing ${key} from AsyncStorage:`, error);
  }
}

