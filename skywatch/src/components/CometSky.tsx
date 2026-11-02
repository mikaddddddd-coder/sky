// Night seen from orbit: a field of stars with a comet in it, the Earth's airglow lying
// in bands along the horizon, and nothing but black below. The special events page's backdrop.
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

// Fixed, so the sky looks the same on every visit.
function seededStars(count: number) {
  let s = 7;
  const next = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => ({ x: next(), y: next(), r: 0.35 + next() ** 3 * 0.9, o: 0.25 + next() * 0.6 }));
}
const STARS = seededStars(140);

// The airglow, top to bottom across BAND px ending a little under the horizon: faint green,
// a broad dull orange, a dark gap, a thin bright blue line, then black.
const BAND = 150;
const AIRGLOW: [number, string, number][] = [
  [0, '#4B7F45', 0],
  [0.14, '#4B7F45', 0.35],
  [0.26, '#9A7445', 0.45],
  [0.44, '#7A5638', 0.38],
  [0.6, '#16161E', 0.5],
  [0.7, '#3F7DF0', 0.85],
  [0.74, '#6FA2FF', 0.9],
  [0.8, '#26406E', 0.55],
  [1, '#000000', 1],
];

/** `horizon` is the y, in px from the top, where the blue line should sit. */
export function CometSky({ horizon }: { horizon: number }) {
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [opacity]);
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('comet');
  const { w, h } = size;
  const bandTop = horizon - BAND * 0.72;
  const skyH = Math.max(bandTop, 1);
  // The comet hangs in the middle of the clear sky, its tail streaming up and to the left.
  const head = { x: w * 0.6, y: skyH * 0.62 };
  const L = Math.min(skyH * 0.36, 96);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} onLayout={onLayout} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
            {AIRGLOW.map(([o, c, a]) => (
              <Stop key={o} offset={o} stopColor={c} stopOpacity={a} />
            ))}
          </LinearGradient>
          {/* In user space, inside the comet's own rotated frame: tail at -L, head at 0. */}
          <LinearGradient id={`${id}-dust`} gradientUnits="userSpaceOnUse" x1={-L} y1={0} x2={0} y2={0}>
            <Stop offset={0} stopColor="#DCE8FF" stopOpacity={0} />
            <Stop offset={0.7} stopColor="#E8F0FF" stopOpacity={0.35} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0.8} />
          </LinearGradient>
          <LinearGradient id={`${id}-ion`} gradientUnits="userSpaceOnUse" x1={-L * 1.3} y1={0} x2={0} y2={0}>
            <Stop offset={0} stopColor="#9DB8FF" stopOpacity={0} />
            <Stop offset={1} stopColor="#B8CCFF" stopOpacity={0.4} />
          </LinearGradient>
          <RadialGradient id={`${id}-coma`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset={0.3} stopColor="#E6F0FF" stopOpacity={0.6} />
            <Stop offset={1} stopColor="#C8D8FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill="#000000" />
        {STARS.map((s, i) => {
          const y = s.y * (bandTop + BAND * 0.4);
          return <Circle key={i} cx={s.x * w} cy={y} r={s.r} fill="#FFFFFF" fillOpacity={y > bandTop ? s.o * 0.5 : s.o} />;
        })}
        <Rect x={0} y={bandTop} width={w} height={BAND} fill={`url(#${id}-glow)`} />
        <G transform={`translate(${head.x} ${head.y}) rotate(70)`}>
          {/* A faint straight ion tail, a curved fan of dust, and the bright head. */}
          <Path d={`M0 -0.6 L${-L * 1.3} -2.2 L${-L * 1.3} 1.2 L0 0.6 Z`} fill={`url(#${id}-ion)`} />
          <Path d={`M0 -1.6 Q${-L * 0.5} -4 ${-L} -8 L${-L} 3 Q${-L * 0.5} 2.4 0 1.6 Z`} fill={`url(#${id}-dust)`} />
          <Circle cx={0} cy={0} r={7} fill={`url(#${id}-coma)`} />
          <Circle cx={0} cy={0} r={1.6} fill="#FFFFFF" />
        </G>
      </Svg>
    </Animated.View>
  );
}
