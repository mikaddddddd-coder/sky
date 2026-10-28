// A faint warm light at the edge of the home page's glow card, as if the sun
// were setting just past its lower right corner. A likelier glow shows more.
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

/** Fills its parent; `score` is the glow chance, 0–100. */
export function GlowOrb({ score }: { score: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('gloworb');
  // Barely there on a quiet evening, a little warmer when the odds are good.
  const s = 0.45 + (0.4 * Math.max(0, Math.min(100, score))) / 100;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size &&
        (() => {
          const { w, h } = size;
          return (
            <Svg width={w} height={h} opacity={s}>
              <Defs>
                <RadialGradient id={`${id}-haze`} cx="50%" cy="50%" r="50%">
                  <Stop offset={0} stopColor="#F6A447" stopOpacity={0.55} />
                  <Stop offset={0.45} stopColor="#E9622A" stopOpacity={0.28} />
                  <Stop offset={1} stopColor="#C8331A" stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
                  <Stop offset={0} stopColor="#FCE592" stopOpacity={0.75} />
                  <Stop offset={0.5} stopColor="#F39A35" stopOpacity={0.35} />
                  <Stop offset={1} stopColor="#F39A35" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={w * 0.92} cy={h * 1.08} rx={w * 0.6} ry={h * 0.75} fill={`url(#${id}-haze)`} />
              <Ellipse cx={w * 0.88} cy={h * 1.02} rx={w * 0.22} ry={h * 0.24} fill={`url(#${id}-sun)`} />
            </Svg>
          );
        })()}
    </View>
  );
}
