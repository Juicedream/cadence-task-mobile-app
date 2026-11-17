import { Platform } from 'react-native';

export const Brand = {
  name: 'Cadence',
  tagline: 'Deliberate Task & Time Ledger',
  version: '1.0.0',
};

export const Palette = {
  // Warm paper & ink surfaces
  paper: '#F6F4EF',
  paperElevated: '#FDFCF9',
  paperSubtle: '#ECE8DF',
  paperMuted: '#E2DDD2',
  border: '#DFD9CC',
  borderStrong: '#C7BFAEE6',

  // Deep espresso/obsidian dark surfaces (used for Active Session & Dark Hero cards)
  ink: '#161614',
  inkElevated: '#21201D',
  inkSubtle: '#2C2B27',
  inkMuted: '#6E6A61',
  inkFaint: '#9B968B',

  // Signature Editorial Accents
  vermilion: '#D84A27',
  vermilionSoft: '#FBECE8',
  vermilionBorder: '#F2C5B9',

  amber: '#C67D15',
  amberSoft: '#FDF3E3',
  amberBorder: '#F0D4A6',

  forest: '#236B48',
  forestSoft: '#E6F2EC',
  forestBorder: '#B7DBC8',

  cobalt: '#2B50AA',
  cobaltSoft: '#E9EEF9',

  crimson: '#B92B27',
  crimsonSoft: '#FCEAE9',

  white: '#FFFFFF',
};

export const Categories = [
  { id: 'deep-work', label: 'Deep Work', color: '#D84A27', bg: '#FBECE8', icon: 'flame-outline' as const },
  { id: 'operations', label: 'Operations', color: '#2B50AA', bg: '#E9EEF9', icon: 'layers-outline' as const },
  { id: 'tax-finance', label: 'Tax & Ledger', color: '#236B48', bg: '#E6F2EC', icon: 'receipt-outline' as const },
  { id: 'client', label: 'Client & Calls', color: '#C67D15', bg: '#FDF3E3', icon: 'people-outline' as const },
  { id: 'personal', label: 'Personal', color: '#6E6A61', bg: '#ECE8DF', icon: 'compass-outline' as const },
] as const;

export type CategoryId = (typeof Categories)[number]['id'];

export function getCategoryMeta(id?: string) {
  return Categories.find((c) => c.id === id) ?? Categories[0];
}

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    mono: 'Menlo',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    mono: 'monospace',
  },
});

// Keep backwards-compatible exports for any template components
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.paperSubtle,
    backgroundSelected: Palette.paperMuted,
    textSecondary: Palette.inkMuted,
  },
  dark: {
    text: Palette.paper,
    background: Palette.ink,
    backgroundElement: Palette.inkElevated,
    backgroundSelected: Palette.inkSubtle,
    textSecondary: Palette.inkFaint,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
