// ─── Crystal Theme Registry ─────────────────────────────────────────
// Single source of truth for all theme variants.
// To add a new theme: append one entry to CRYSTAL_THEMES — nothing else needed.

export interface GlowColors {
  glow: [number, number, number];
  highlight: [number, number, number];
  star: [number, number, number];
}

export interface CrystalTheme {
  key: string;
  label: string;
  /** Swatch color shown in the UI picker */
  swatch: string;
  // Glass
  glassColor: string;
  energyColor: string;
  lightColor: string;
  glowColors: GlowColors;
  opacity: number;
  ior: number;
  chromaticAberration: number;
  envMapIntensity: number;
  fresnelPower: number;
  absorption: number;
  // UI
  accent: string;
  accentBorder: string;
  accentBg: string;
  gradientFrom: string;
  gradientTo: string;
}

export const CRYSTAL_THEMES: CrystalTheme[] = [
  {
    key: 'white',
    label: 'White',
    swatch: '#e2e8f0',
    glassColor: '#f0f0f5',
    energyColor: '#e0e4ff',
    lightColor: '#ffffff',
    glowColors: { glow: [0.9, 0.92, 1.0], highlight: [1.0, 1.0, 1.0], star: [1.0, 1.0, 1.0] },
    opacity: 0.1,
    ior: 1.5,
    chromaticAberration: 0.7,
    envMapIntensity: 1.3,
    fresnelPower: 1.5,
    absorption: 2.0,
    accent: '#e2e8f0',
    accentBorder: 'rgba(226,232,240,0.5)',
    accentBg: 'rgba(226,232,240,0.15)',
    gradientFrom: '#cbd5e1',
    gradientTo: '#f1f5f9',
  },
  {
    key: 'amber',
    label: 'Amber',
    swatch: '#ff9a16',
    glassColor: '#fde8cd',
    energyColor: '#ff9a16',
    lightColor: '#ff9a16',
    glowColors: { glow: [1.0, 0.65, 0.15], highlight: [1.0, 0.85, 0.45], star: [1.0, 0.8, 0.5] },
    opacity: 0.12,
    ior: 1.5,
    chromaticAberration: 0.6,
    envMapIntensity: 1.0,
    fresnelPower: 1.2,
    absorption: 2.5,
    accent: '#ffb347',
    accentBorder: 'rgba(255,154,22,0.4)',
    accentBg: 'rgba(255,154,22,0.15)',
    gradientFrom: '#ff9a16',
    gradientTo: '#ffcc00',
  },
  {
    key: 'blue',
    label: 'Blue',
    swatch: '#3DB5E6',
    glassColor: '#bae6fd',
    energyColor: '#3DB5E6',
    lightColor: '#3DB5E6',
    glowColors: { glow: [0.15, 0.65, 1.0], highlight: [0.45, 0.85, 1.0], star: [0.5, 0.8, 1.0] },
    opacity: 0.12,
    ior: 1.45,
    chromaticAberration: 0.5,
    envMapIntensity: 1.2,
    fresnelPower: 1.5,
    absorption: 2.5,
    accent: '#7dd3fc',
    accentBorder: 'rgba(61,181,230,0.4)',
    accentBg: 'rgba(61,181,230,0.15)',
    gradientFrom: '#3DB5E6',
    gradientTo: '#7dd3fc',
  },
  {
    key: 'teal',
    label: 'Teal',
    swatch: '#14b8a6',
    glassColor: '#ccfbf1',
    energyColor: '#14b8a6',
    lightColor: '#14b8a6',
    glowColors: { glow: [0.1, 0.85, 0.75], highlight: [0.3, 1.0, 0.9], star: [0.4, 1.0, 0.9] },
    opacity: 0.12,
    ior: 1.47,
    chromaticAberration: 0.5,
    envMapIntensity: 1.1,
    fresnelPower: 1.3,
    absorption: 2.5,
    accent: '#5eead4',
    accentBorder: 'rgba(20,184,166,0.4)',
    accentBg: 'rgba(20,184,166,0.15)',
    gradientFrom: '#14b8a6',
    gradientTo: '#5eead4',
  },
  {
    key: 'green',
    label: 'Green',
    swatch: '#22c55e',
    glassColor: '#d1fae5',
    energyColor: '#22c55e',
    lightColor: '#22c55e',
    glowColors: { glow: [0.15, 1.0, 0.4], highlight: [0.45, 1.0, 0.65], star: [0.5, 1.0, 0.7] },
    opacity: 0.12,
    ior: 1.48,
    chromaticAberration: 0.5,
    envMapIntensity: 1.1,
    fresnelPower: 1.3,
    absorption: 2.5,
    accent: '#4ade80',
    accentBorder: 'rgba(34,197,94,0.4)',
    accentBg: 'rgba(34,197,94,0.15)',
    gradientFrom: '#22c55e',
    gradientTo: '#4ade80',
  },
  {
    key: 'red',
    label: 'Red',
    swatch: '#ef4444',
    glassColor: '#fecaca',
    energyColor: '#ef4444',
    lightColor: '#ef4444',
    glowColors: { glow: [1.0, 0.2, 0.15], highlight: [1.0, 0.45, 0.35], star: [1.0, 0.5, 0.4] },
    opacity: 0.12,
    ior: 1.5,
    chromaticAberration: 0.6,
    envMapIntensity: 1.0,
    fresnelPower: 1.2,
    absorption: 2.5,
    accent: '#f87171',
    accentBorder: 'rgba(239,68,68,0.4)',
    accentBg: 'rgba(239,68,68,0.15)',
    gradientFrom: '#ef4444',
    gradientTo: '#f87171',
  },
  {
    key: 'purple',
    label: 'Purple',
    swatch: '#a855f7',
    glassColor: '#e9d5ff',
    energyColor: '#a855f7',
    lightColor: '#a855f7',
    glowColors: { glow: [0.7, 0.2, 1.0], highlight: [0.8, 0.5, 1.0], star: [0.85, 0.6, 1.0] },
    opacity: 0.12,
    ior: 1.47,
    chromaticAberration: 0.55,
    envMapIntensity: 1.1,
    fresnelPower: 1.4,
    absorption: 2.5,
    accent: '#c084fc',
    accentBorder: 'rgba(168,85,247,0.4)',
    accentBg: 'rgba(168,85,247,0.15)',
    gradientFrom: '#a855f7',
    gradientTo: '#c084fc',
  },
];

/** Lookup map for quick access by key */
export const CRYSTAL_THEME_MAP = Object.fromEntries(
  CRYSTAL_THEMES.map((t) => [t.key, t])
) as Record<string, CrystalTheme>;

/** Default theme key */
export const DEFAULT_THEME_KEY = 'amber';
