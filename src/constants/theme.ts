import { Platform } from 'react-native';

export const Brand = {
  name: 'Todoist Cadence',
  shortName: 'Todoist',
  tagline: 'Todoist workflow with 30m · 15m · Start push alerts & live tracker',
  version: '2.0.0',
};

export const TodoistColors = {
  // Signature Todoist Brand Red
  red: '#DC4C3E',
  redDark: '#B8362A',
  redSoft: '#FDECEB',
  redBorder: '#F7C6C1',

  // Surfaces
  bg: '#FFFFFF',
  bgSecondary: '#FAFAFA',
  bgTertiary: '#F3F3F3',
  card: '#FFFFFF',
  border: '#EEEEEE',
  borderStrong: '#E0E0E0',

  // Typography
  text: '#202020',
  textSecondary: '#666666',
  textMuted: '#8A8A8A',
  textFaint: '#B0B0B0',

  // Todoist 4-Tier Priority System
  p1: '#D1453B', // Priority 1: Urgent Red
  p1Bg: '#FCEAE8',
  p2: '#EB8909', // Priority 2: High Orange
  p2Bg: '#FDF1E0',
  p3: '#246FE0', // Priority 3: Medium Blue
  p3Bg: '#E8F0FC',
  p4: '#808080', // Priority 4: Normal Grey
  p4Bg: '#F3F3F3',

  // Semantic Date & Status Colors (matching Todoist date chips)
  dateToday: '#058527', // Todoist green for Today
  dateTodayBg: '#E7F5EB',
  dateTomorrow: '#AD6200', // Todoist warm amber for Tomorrow
  dateTomorrowBg: '#FDF3E4',
  dateUpcoming: '#692EC2', // Todoist purple for Upcoming / Future dates
  dateUpcomingBg: '#F2EBF9',
  dateOverdue: '#D1453B',
  dateOverdueBg: '#FCEAE8',

  // Active Live Tracker Bar
  trackerBg: '#1F1F1F',
  trackerCard: '#2A2A2A',
  trackerBorder: '#383838',

  white: '#FFFFFF',
};

// Backwards-compatible Palette alias so any utility references remain clean
export const Palette = {
  paper: TodoistColors.bg,
  paperElevated: TodoistColors.card,
  paperSubtle: TodoistColors.bgSecondary,
  paperMuted: TodoistColors.bgTertiary,
  border: TodoistColors.border,
  borderStrong: TodoistColors.borderStrong,
  ink: TodoistColors.text,
  inkElevated: TodoistColors.trackerBg,
  inkSubtle: TodoistColors.trackerCard,
  inkMuted: TodoistColors.textSecondary,
  inkFaint: TodoistColors.textMuted,
  vermilion: TodoistColors.red,
  vermilionSoft: TodoistColors.redSoft,
  vermilionBorder: TodoistColors.redBorder,
  amber: TodoistColors.p2,
  amberSoft: TodoistColors.p2Bg,
  amberBorder: '#F5D4A9',
  forest: TodoistColors.dateToday,
  forestSoft: TodoistColors.dateTodayBg,
  forestBorder: '#B9E2C4',
  cobalt: TodoistColors.p3,
  cobaltSoft: TodoistColors.p3Bg,
  crimson: TodoistColors.p1,
  crimsonSoft: TodoistColors.p1Bg,
  white: TodoistColors.white,
};

export const Priorities = [
  {
    level: 1,
    label: 'Priority 1',
    short: 'P1',
    color: TodoistColors.p1,
    fill: TodoistColors.p1Bg,
    desc: 'Urgent',
  },
  {
    level: 2,
    label: 'Priority 2',
    short: 'P2',
    color: TodoistColors.p2,
    fill: TodoistColors.p2Bg,
    desc: 'High',
  },
  {
    level: 3,
    label: 'Priority 3',
    short: 'P3',
    color: TodoistColors.p3,
    fill: TodoistColors.p3Bg,
    desc: 'Medium',
  },
  {
    level: 4,
    label: 'Priority 4',
    short: 'P4',
    color: TodoistColors.p4,
    fill: 'transparent',
    desc: 'Normal',
  },
] as const;

export type PriorityLevel = 1 | 2 | 3 | 4;

export function getPriorityMeta(level?: number) {
  return Priorities.find((p) => p.level === level) ?? Priorities[3];
}

// Todoist Projects (#Inbox, #Tax & Finance, #Work, #Personal, #Errands)
export const Categories = [
  {
    id: 'inbox',
    label: 'Inbox',
    color: '#246FE0',
    bg: '#E8F0FC',
    icon: 'tray-full-outline' as const,
  },
  {
    id: 'tax-finance',
    label: 'Tax & Finance',
    color: '#058527',
    bg: '#E7F5EB',
    icon: 'receipt-outline' as const,
  },
  {
    id: 'deep-work',
    label: 'Work & Projects',
    color: '#DC4C3E',
    bg: '#FDECEB',
    icon: 'briefcase-outline' as const,
  },
  {
    id: 'client',
    label: 'Meetings & Calls',
    color: '#EB8909',
    bg: '#FDF1E0',
    icon: 'people-outline' as const,
  },
  {
    id: 'personal',
    label: 'Personal',
    color: '#692EC2',
    bg: '#F2EBF9',
    icon: 'person-outline' as const,
  },
  {
    id: 'operations',
    label: 'Operations',
    color: '#525252',
    bg: '#F3F3F3',
    icon: 'layers-outline' as const,
  },
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

export const Colors = {
  light: {
    text: TodoistColors.text,
    background: TodoistColors.bg,
    backgroundElement: TodoistColors.bgSecondary,
    backgroundSelected: TodoistColors.bgTertiary,
    textSecondary: TodoistColors.textSecondary,
  },
  dark: {
    text: TodoistColors.white,
    background: TodoistColors.trackerBg,
    backgroundElement: TodoistColors.trackerCard,
    backgroundSelected: TodoistColors.trackerBorder,
    textSecondary: TodoistColors.textMuted,
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
