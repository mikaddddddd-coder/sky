import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SKY_GRADIENTS, type SkyPhase } from '../constants/theme';

export function skyPhaseFor(now: Date, sunset: Date, civilDusk: Date): SkyPhase {
  const t = now.getTime();
  if (t < sunset.getTime() - 90 * 60_000) return t < sunset.getTime() - 14 * 3600_000 ? 'night' : 'day';
  if (t < sunset.getTime()) return 'golden';
  if (t < civilDusk.getTime() + 30 * 60_000) return 'dusk';
  return 'night';
}

export function SkyBackground({ phase, children }: { phase: SkyPhase; children: ReactNode }) {
  return (
    <LinearGradient colors={SKY_GRADIENTS[phase]} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}
