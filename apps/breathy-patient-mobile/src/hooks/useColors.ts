import { useThemeStore } from '../store/themeStore';

// ---------------------------------------------------------------------------
// Theme Colors — Central color tokens for Light & Dark mode
// ---------------------------------------------------------------------------
const lightColors = {
  // Backgrounds
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  input: '#f8fafc',

  // Text
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',

  // Borders
  border: '#f1f5f9',
  borderMedium: '#e2e8f0',
  borderDark: '#cbd5e1',

  // Brand
  brand: '#22ae9e',
  brandDark: '#0f766e',
  brandLight: '#ccfbf1',
  brandBg: '#f0fdfa',

  // Status
  success: '#22c55e',
  successBg: '#f0fdf4',
  error: '#ef4444',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  warning: '#f59e0b',
  warningBg: '#fef3c7',

  // Specific
  tabBar: '#ffffff',
  tabBarBorder: '#f1f5f9',
  headerBg: '#ffffff',
  statusBar: '#f8fafc',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000',
  icon: '#64748b',
  iconActive: '#22ae9e',
  avatarBg: '#f0fdfa',
  badgeBg: '#e2e8f0',
  switchTrackOff: '#e2e8f0',
  switchTrackOn: '#14b8a6',
};

const darkColors: typeof lightColors = {
  // Backgrounds
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#334155',
  input: '#1e293b',

  // Text
  text: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textTertiary: '#64748b',
  textInverse: '#0f172a',

  // Borders
  border: '#334155',
  borderMedium: '#475569',
  borderDark: '#64748b',

  // Brand
  brand: '#2dd4bf',
  brandDark: '#14b8a6',
  brandLight: '#042f2e',
  brandBg: '#042f2e',

  // Status
  success: '#4ade80',
  successBg: '#052e16',
  error: '#f87171',
  errorBg: '#450a0a',
  errorBorder: '#7f1d1d',
  warning: '#fbbf24',
  warningBg: '#451a03',

  // Specific
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
  headerBg: '#1e293b',
  statusBar: '#0f172a',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000',
  icon: '#94a3b8',
  iconActive: '#2dd4bf',
  avatarBg: '#042f2e',
  badgeBg: '#334155',
  switchTrackOff: '#475569',
  switchTrackOn: '#14b8a6',
};

export type ThemeColors = typeof lightColors;

export function useColors(): ThemeColors {
  const resolved = useThemeStore((s) => s.resolved);
  return resolved === 'dark' ? darkColors : lightColors;
}
