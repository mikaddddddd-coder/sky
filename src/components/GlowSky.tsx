// A living sunset sky: pink and amber cloud bands drift and breathe over a
// slowly deepening gradient, with the sun sitting on the horizon.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

const native = Platform.OS !== 'web';
const ease = Easing.inOut(Easing.sin);

type Cloud = { x: number; y: number; w: number; h: number; color: string; opacity: number; drift: number; period: number };

// Positions are fractions of the sky; drift is in fractions of its width.
const CLOUDS: Cloud[] = [
  { x: 0.05, y: 0.18, w: 0.9, h: 0.16, color: '#F6A6B8', opacity: 0.75, drift: 0.08, period: 26000 },
  { x: 0.45, y: 0.3, w: 0.8, h: 0.14, color: '#FF9C7A', opacity: 0.8, drift: -0.1, period: 21000 },
  { x: -0.2, y: 0.42, w: 0.95, h: 0.15, color: '#F78DA7', opacity: 0.7, drift: 0.12, period: 30000 },
  { x: 0.3, y: 0.56, w: 0.9, h: 0.12, color: '#FFB36B', opacity: 0.75, drift: -0.07, period: 18000 },
  { x: -0.1, y: 0.08, w: 0.7, h: 0.1, color: '#E58FB5', opacity: 0.55, drift: 0.06, period: 34000 },
];

function useLoop(period: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: ease, useNativeDriver: native, delay }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: ease, useNativeDriver: native }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, period, delay]);
  return v;
}

function CloudBand({ c, w, h, index }: { c: Cloud; w: number; h: number; index: number }) {
  const id = useSvgId(`cloud${index}`);
  const t = useLoop(c.period, index * 400);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, c.drift * w] });
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [c.opacity, c.opacity * 0.75, c.opacity] });
  const cw = c.w * w;
  const ch = c.h * h;
  return (
    <Animated.View style={{ position: 'absolute', left: c.x * w, top: c.y * h, width: cw, height: ch, opacity, transform: [{ translateX }] }}>
      <Svg width={cw} height={ch}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={c.color} stopOpacity={1} />
            <Stop offset={0.55} stopColor={c.color} stopOpacity={0.55} />
            <Stop offset={1} stopColor={c.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={cw / 2} cy={ch / 2} rx={cw / 2} ry={ch / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** `horizon` is where the sun sits, as a fraction of the sky's height. */
export function GlowSky({ horizon = 1 }: { horizon?: number }) {
  const [size, setSize] = useState({ w: 390, h: 360 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('glowsky');
  const deepen = useLoop(16000);
  const pulse = useLoop(5000, 600);
  const sunScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const { w, h } = size;
  const sunR = Math.min(w, h) * 0.09;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#4D5B91" />
            <Stop offset={0.35} stopColor="#B07AA6" />
            <Stop offset={0.7} stopColor="#F29A97" />
            <Stop offset={1} stopColor="#FFC58A" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}-a)`} />
      </Svg>

      {/* A deeper rose palette fades in and out over the base sky. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: deepen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }) }]}>
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#3B3F7A" />
              <Stop offset={0.4} stopColor="#C0608E" />
              <Stop offset={0.75} stopColor="#F57E7A" />
              <Stop offset={1} stopColor="#FFAF6E" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}-b)`} />
        </Svg>
      </Animated.View>

      {/* Setting sun with a breathing halo, half below the horizon. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: w * 0.62 - sunR * 3,
          top: h * horizon - sunR * 3.4,
          width: sunR * 6,
          height: sunR * 6,
          transform: [{ scale: sunScale }],
        }}
      >
        <Svg width={sunR * 6} height={sunR * 6}>
          <Defs>
            <RadialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor="#FFF3D6" stopOpacity={1} />
              <Stop offset={0.18} stopColor="#FFD9A0" stopOpacity={1} />
              <Stop offset={0.35} stopColor="#FFB27A" stopOpacity={0.55} />
              <Stop offset={1} stopColor="#FF9A7A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={sunR * 3} cy={sunR * 3} r={sunR * 3} fill={`url(#${id}-sun)`} />
        </Svg>
      </Animated.View>

      {CLOUDS.map((c, i) => (
        <CloudBand key={i} c={c} w={w} h={h} index={i} />
      ))}
    </View>
  );
}
