// Sky palettes keyed by phase of the day; the Tonight screen picks one from the
// current sun altitude so the UI follows the real sky.
export type SkyPhase = 'day' | 'golden' | 'dusk' | 'night';

export const SKY_GRADIENTS: Record<SkyPhase, readonly [string, string, ...string[]]> = {
  day: ['#3A7BD5', '#6FB1FC', '#BFE3FF'],
  golden: ['#2B3A67', '#C0566F', '#F7A35C', '#FFD08A'],
  dusk: ['#0F1033', '#3B2A63', '#8E4A7A', '#E07A5F'],
  night: ['#03040C', '#0B1030', '#1A2150'],
};

export const colors = {
  text: '#F5F3FF',
  textDim: 'rgba(245,243,255,0.65)',
  card: 'rgba(12,10,35,0.42)',
  cardBorder: 'rgba(255,255,255,0.18)',
  glow: '#FF8A5B',
  moon: '#E8E4FF',
  venus: '#FFE7A3',
  typhoon: '#7FD1FF',
  good: '#7CF2B0',
  warn: '#FFB86B',
  bad: '#FF6B81',
  tabBar: '#070A1C',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { md: 16, lg: 24 };

// One quiet type scale: system face, few weights, tabular digits for numbers.
export const type = {
  largeTitle: { fontSize: 30, fontWeight: '600', letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  headline: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 17 },
  label: { fontSize: 11, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase' },
  figure: { fontSize: 44, fontWeight: '200', letterSpacing: -1, fontVariant: ['tabular-nums'] },
} as const;
