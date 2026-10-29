export type ThemeMode = 'system' | 'light' | 'dark';

export const LightColors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceSubtle: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // Text colors
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Primary
  primary: '#0F172A',
  primaryLight: '#334155',
  accent: '#059669',
  accentLight: '#D1FAE5',
  accentDark: '#047857',

  // Functional
  favorite: '#EF4444',
  favoriteLight: '#FEE2E2',
  destructive: '#DC2626',
  destructiveLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FEF3C7',

  // WhatsApp
  whatsapp: '#25D366',
  whatsappDark: '#128C7E',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderStrong: '#CBD5E1',

  // Badges & Selection
  overlay: 'rgba(15, 23, 42, 0.6)',
  overlayDark: 'rgba(0, 0, 0, 0.85)',
  badgeBackground: 'rgba(15, 23, 42, 0.75)',
  badgeText: '#FFFFFF',
  selectionBlue: '#000000',
  selectionBorder: '#000000',
  selectionTint: 'rgba(0, 0, 0, 0.08)',
};

export const DarkColors = {
  // Backgrounds - Pure OLED Pitch Black
  background: '#000000',
  surface: '#121212',
  surfaceSubtle: '#1A1A1A',
  surfaceElevated: '#242424',

  // Text colors - Neutral Crisp
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textInverse: '#000000',

  // Primary
  primary: '#FFFFFF',
  primaryLight: '#E4E4E7',
  accent: '#10B981',
  accentLight: '#064E3B',
  accentDark: '#34D399',

  // Functional
  favorite: '#EF4444',
  favoriteLight: '#450A0A',
  destructive: '#EF4444',
  destructiveLight: '#450A0A',
  warning: '#F59E0B',
  warningLight: '#451A03',

  // WhatsApp
  whatsapp: '#25D366',
  whatsappDark: '#128C7E',

  // Borders - Pure Neutral
  border: '#27272A',
  borderLight: '#18181B',
  borderStrong: '#3F3F46',

  // Badges & Selection - High contrast monochrome
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayDark: 'rgba(0, 0, 0, 0.98)',
  badgeBackground: 'rgba(0, 0, 0, 0.90)',
  badgeText: '#FFFFFF',
  selectionBlue: '#FFFFFF',
  selectionBorder: '#FFFFFF',
  selectionTint: 'rgba(255, 255, 255, 0.15)',
};

// Default export for backward compatibility
export const Colors = LightColors;

export const Typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};
