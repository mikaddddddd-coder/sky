// Full-bleed atmospheric backdrops, drawn with gradients and soft radial glows
// (no photos), one per scene: the live sky, sunset clouds, moonlit night, typhoon.
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { SkyPhase } from '../constants/theme';

export type Scene = SkyPhase | 'glow' | 'moon' | 'typhoon';

type Blob = { cx: number; cy: number; rx: number; ry: number; color: string; opacity: number };
type SceneDef = { stops: [number, string][]; blobs: Blob[] };

const SCENES: Record<Scene, SceneDef> = {
  day: {
    stops: [[0, '#4F79B8'], [0.55, '#8EA9D2'], [1, '#D7D9E4']],
    blobs: [{ cx: 0.8, cy: 0.15, rx: 0.6, ry: 0.25, color: '#FFFFFF', opacity: 0.25 }],
  },
  golden: {
    stops: [[0, '#56658C'], [0.45, '#9A95AE'], [0.75, '#E2AE82'], [1, '#EC8B55']],
    blobs: [
      { cx: 0.2, cy: 0.62, rx: 0.7, ry: 0.12, color: '#F59A68', opacity: 0.45 },
      { cx: 0.85, cy: 0.75, rx: 0.6, ry: 0.1, color: '#E46F5A', opacity: 0.35 },
    ],
  },
  dusk: {
    stops: [[0, '#232A4C'], [0.4, '#5E4D73'], [0.75, '#C2705E'], [1, '#E2804A']],
    blobs: [
      { cx: 0.3, cy: 0.7, rx: 0.8, ry: 0.14, color: '#F08A5D', opacity: 0.4 },
      { cx: 0.8, cy: 0.55, rx: 0.5, ry: 0.08, color: '#B9566B', opacity: 0.35 },
    ],
  },
  night: {
    stops: [[0, '#05060F'], [0.6, '#0E1430'], [1, '#1E2452']],
    blobs: [{ cx: 0.5, cy: 1.05, rx: 0.9, ry: 0.3, color: '#3B4A8C', opacity: 0.35 }],
  },
  glow: {
    stops: [[0, '#8C8274'], [0.5, '#B79A78'], [1, '#C9A66E']],
    blobs: [
      { cx: 0.1, cy: 0.32, rx: 0.55, ry: 0.07, color: '#F2875A', opacity: 0.7 },
      { cx: 0.7, cy: 0.22, rx: 0.6, ry: 0.11, color: '#C9573E', opacity: 0.55 },
      { cx: 0.45, cy: 0.5, rx: 0.75, ry: 0.13, color: '#F5935F', opacity: 0.6 },
      { cx: 0.85, cy: 0.62, rx: 0.4, ry: 0.16, color: '#B4553F', opacity: 0.4 },
    ],
  },
  moon: {
    stops: [[0, '#2A1610'], [0.5, '#1A0E0C'], [1, '#2E1812']],
    blobs: [
      { cx: 0, cy: 0.1, rx: 0.7, ry: 0.5, color: '#B8603A', opacity: 0.55 },
      { cx: 1, cy: 0.5, rx: 0.6, ry: 0.5, color: '#9A4A2C', opacity: 0.5 },
      { cx: 0.1, cy: 0.95, rx: 0.7, ry: 0.4, color: '#8E4126', opacity: 0.45 },
      { cx: 0.5, cy: 0.42, rx: 0.5, ry: 0.3, color: '#140A08', opacity: 0.7 },
    ],
  },
  typhoon: {
    stops: [[0, '#3E7CCB'], [0.6, '#5B92D6'], [1, '#2F5FA8']],
    blobs: [{ cx: 0.15, cy: 0.5, rx: 0.6, ry: 0.5, color: '#8DB4E6', opacity: 0.35 }],
  },
};

export function skyPhaseFor(now: Date, sunset: Date, civilDusk: Date): SkyPhase {
  const t = now.getTime();
  if (t < sunset.getTime() - 90 * 60_000) return t < sunset.getTime() - 14 * 3600_000 ? 'night' : 'day';
  if (t < sunset.getTime()) return 'golden';
  if (t < civilDusk.getTime() + 30 * 60_000) return 'dusk';
  return 'night';
}

export function SceneBackground({ scene }: { scene: Scene }) {
  const [size, setSize] = useState({ w: 390, h: 844 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const def = SCENES[scene];
  const { w, h } = size;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            {def.stops.map(([o, c]) => (
              <Stop key={o} offset={o} stopColor={c} />
            ))}
          </LinearGradient>
          {def.blobs.map((b, i) => (
            <RadialGradient key={i} id={`b${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor={b.color} stopOpacity={b.opacity} />
              <Stop offset={1} stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
          {scene === 'typhoon' && (
            <RadialGradient id="limb" cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor="#7FA8E0" stopOpacity={0.15} />
              <Stop offset={0.8} stopColor="#B7D2F5" stopOpacity={0.4} />
              <Stop offset={0.93} stopColor="#F2F8FF" stopOpacity={0.95} />
              <Stop offset={0.965} stopColor="#9CC0EE" stopOpacity={0.35} />
              <Stop offset={1} stopColor="#2F5FA8" stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="url(#sky)" />
        {scene === 'typhoon' && <Circle cx={w * 0.02} cy={h * 0.42} r={h * 0.56} fill="url(#limb)" />}
        {def.blobs.map((b, i) => (
          <Ellipse key={i} cx={b.cx * w} cy={b.cy * h} rx={b.rx * w} ry={b.ry * h} fill={`url(#b${i})`} />
        ))}
      </Svg>
    </View>
  );
}
