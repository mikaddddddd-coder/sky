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
  card: 'rgba(255,255,255,0.08)',
  cardBorder: 'rgba(255,255,255,0.14)',
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
