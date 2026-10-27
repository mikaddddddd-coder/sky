// The sky behind the Tonight cards. On top of the plain phase gradient it adds
// a sparse star field (strongest at night, gone by day) and soft colour low in
// the sky that follows the real light, so the frosted cards have something to
// blur and pick up a tint from.
import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import type { SkyPhase } from '../constants/theme';
import { SceneBackground } from './SceneBackground';
import { useSvgId } from './useSvgId';

type Glow = { cx: number; cy: number; rx: number; ry: number; color: string; opacity: number };

// How visible the stars are, and where the colour sits, for each phase.
const PHASE: Record<SkyPhase, { stars: number; glows: Glow[] }> = {
  night: {
    stars: 1,
    glows: [
      // Last light / city glow on the horizon, and a cool wash high up.
      { cx: 0.25, cy: 0.98, rx: 0.9, ry: 0.22, color: '#8E5A8C', opacity: 0.45 },
      { cx: 0.85, cy: 0.9, rx: 0.6, ry: 0.18, color: '#C4735E', opacity: 0.25 },
      { cx: 0.9, cy: 0.12, rx: 0.7, ry: 0.28, color: '#4A5FB0', opacity: 0.3 },
    ],
  },
  dusk: {
    stars: 0.55,
    glows: [
      { cx: 0.3, cy: 0.95, rx: 0.9, ry: 0.25, color: '#F08A5D', opacity: 0.5 },
      { cx: 0.85, cy: 0.75, rx: 0.6, ry: 0.18, color: '#B9566B', opacity: 0.4 },
    ],
  },
  golden: {
    stars: 0.1,
    glows: [
      { cx: 0.25, cy: 0.9, rx: 0.9, ry: 0.25, color: '#FFB06B', opacity: 0.45 },
      { cx: 0.9, cy: 0.35, rx: 0.6, ry: 0.2, color: '#F7C8A0', opacity: 0.25 },
    ],
  },
  day: {
    stars: 0,
    glows: [{ cx: 0.8, cy: 0.1, rx: 0.7, ry: 0.25, color: '#FFFFFF', opacity: 0.25 }],
  },
};

type Star = { x: number; y: number; r: number; o: number };

// Seeded so the sky is the same on every render; denser near the top.
function makeStars(count: number): Star[] {
  let s = 11;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const big = rand() > 0.93;
    return { x: rand(), y: rand() ** 1.6 * 0.85, r: big ? 0.9 + rand() * 0.6 : 0.35 + rand() * 0.45, o: 0.2 + rand() * (big ? 0.6 : 0.4) };
  });
}

const STARS = makeStars(120);

export function TonightBackdrop({ phase }: { phase: SkyPhase }) {
  const [size, setSize] = useState({ w: 390, h: 844 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('backdrop');
  const def = PHASE[phase];
  const { w, h } = size;
  const stars = useMemo(
    () => (def.stars > 0 ? STARS.map((s, i) => <Circle key={i} cx={s.x * w} cy={s.y * h} r={s.r} fill="#FFFFFF" fillOpacity={s.o * def.stars} />) : null),
    [def.stars, w, h],
  );

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <SceneBackground scene={phase} />
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          {def.glows.map((g, i) => (
            <RadialGradient key={i} id={`${id}-g${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor={g.color} stopOpacity={g.opacity} />
              <Stop offset={1} stopColor={g.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {def.glows.map((g, i) => (
          <Ellipse key={i} cx={g.cx * w} cy={g.cy * h} rx={g.rx * w} ry={g.ry * h} fill={`url(#${id}-g${i})`} />
        ))}
        {stars}
      </Svg>
    </View>
  );
}
