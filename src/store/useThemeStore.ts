import { create } from 'zustand';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ThemeMode } from '@/constants/theme';
import { getDatabase } from '@/db/database';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadSavedTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',

  setMode: async (mode: ThemeMode) => {
    set({ mode });
    try {
      const db = await getDatabase();
      // Store in app_settings table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        ['theme_mode', mode]
      );
    } catch (err) {
      console.warn('Could not persist theme preference:', err);
    }
  },

  loadSavedTheme: async () => {
    try {
      const db = await getDatabase();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        ['theme_mode']
      );
      if (row && (row.value === 'system' || row.value === 'light' || row.value === 'dark')) {
        set({ mode: row.value as ThemeMode });
      }
    } catch (err) {
      console.warn('Could not load saved theme preference:', err);
    }
  },
}));

/**
 * Convenient React hook to get current theme colors, dark status, and switcher
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const systemScheme = useColorScheme();

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return {
    mode,
    setMode,
    isDark,
    colors,
  };
}
