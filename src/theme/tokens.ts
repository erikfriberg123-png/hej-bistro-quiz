// Neon Diner design tokens — single source of truth

export const darkColors = {
  // Surfaces
  bg0: '#07070c',
  bg1: '#0d0d15',
  bg2: '#14141f',
  bg3: '#1c1c2a',
  line: '#262635',
  lineStrong: '#34344a',

  // Neon accents
  pink: '#ff38a5',
  pinkGlow: 'rgba(255, 56, 165, 0.55)',
  cyan: '#36e0e0',
  cyanGlow: 'rgba(54, 224, 224, 0.55)',
  yellow: '#ffd54f',
  yellowGlow: 'rgba(255, 213, 79, 0.55)',

  // Semantic
  correct: '#36e0a8',
  correctGlow: 'rgba(54, 224, 168, 0.5)',
  wrong: '#ff5a5a',
  wrongGlow: 'rgba(255, 90, 90, 0.5)',

  // Text
  text1: '#f5f5fa',
  text2: '#a8a8c0',
  text3: '#6b6b88',
  text4: '#44445a',
} as const;

export const lightColors = {
  // Surfaces
  bg0: '#f0eeff',
  bg1: '#fafaff',
  bg2: '#efefff',
  bg3: '#e5e4f8',
  line: '#d4d4ea',
  lineStrong: '#b8b8d8',

  // Neon accents (same — they pop on light too)
  pink: '#ff38a5',
  pinkGlow: 'rgba(255, 56, 165, 0.18)',
  cyan: '#36e0e0',
  cyanGlow: 'rgba(54, 224, 224, 0.18)',
  yellow: '#ffd54f',
  yellowGlow: 'rgba(255, 213, 79, 0.18)',

  // Semantic
  correct: '#1dbf85',
  correctGlow: 'rgba(29, 191, 133, 0.18)',
  wrong: '#e03030',
  wrongGlow: 'rgba(224, 48, 48, 0.18)',

  // Text
  text1: '#0d0d20',
  text2: '#3a3a5e',
  text3: '#6b6b88',
  text4: '#9898b4',
} as const;

// Default export keeps existing imports working (always dark — runtime theming via useTheme())
export const colors = darkColors;

export const fonts = {
  display400: 'SpaceGrotesk_400Regular',
  display500: 'SpaceGrotesk_500Medium',
  display600: 'SpaceGrotesk_600SemiBold',
  display700: 'SpaceGrotesk_700Bold',
  mono500: 'JetBrainsMono_500Medium',
  mono700: 'JetBrainsMono_700Bold',
  neon700: 'Caveat_700Bold',
  // DM Sans fallbacks (kept until full replacement)
  dmSans400: 'DMSans_400Regular',
  dmSans500: 'DMSans_500Medium',
  dmSans600: 'DMSans_600SemiBold',
  dmSans700: 'DMSans_700Bold',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const spacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
} as const;
