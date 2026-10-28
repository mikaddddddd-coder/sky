// A faint warm light at the edge of the home page's glow card, as if the sun
// were setting just past its lower right corner. A likelier glow shows more.
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

/** Fills its parent; `score` is the glow chance, 0–100. `fire` floods the card with red for a 火烧云. */
export function GlowOrb({ score, fire = false }: { score: number; fire?: boolean }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('gloworb');
  // Barely there on a quiet evening, a little warmer when the odds are good.
  const s = fire ? 1 : 0.45 + (0.4 * Math.max(0, Math.min(100, score))) / 100;
  // On a 火烧云 the haze climbs most of the way up the card and runs deeper red.
  const reach = fire ? 1.5 : 1;
  const haze = fire ? ['#FF7A3D', '#F0362A', '#B0142E'] : ['#F6A447', '#E9622A', '#C8331A'];

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size &&
        (() => {
          const { w, h } = size;
          return (
            <Svg width={w} height={h} opacity={s}>
              <Defs>
                <RadialGradient id={`${id}-haze`} cx="50%" cy="50%" r="50%">
                  <Stop offset={0} stopColor={haze[0]} stopOpacity={fire ? 0.7 : 0.55} />
                  <Stop offset={0.45} stopColor={haze[1]} stopOpacity={fire ? 0.4 : 0.28} />
                  <Stop offset={1} stopColor={haze[2]} stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
                  <Stop offset={0} stopColor="#FCE592" stopOpacity={0.75} />
                  <Stop offset={0.5} stopColor="#F39A35" stopOpacity={0.35} />
                  <Stop offset={1} stopColor="#F39A35" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={w * 0.92} cy={h * 1.08} rx={w * 0.6 * reach} ry={h * 0.75 * reach} fill={`url(#${id}-haze)`} />
              <Ellipse cx={w * 0.88} cy={h * 1.02} rx={w * 0.22} ry={h * 0.24} fill={`url(#${id}-sun)`} />
            </Svg>
          );
        })()}
    </View>
  );
}
