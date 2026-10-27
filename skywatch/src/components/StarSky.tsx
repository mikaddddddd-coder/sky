// A black night sky with a scatter of stars. Most are still; a few groups
// twinkle out of step. `drift` shifts the field a little for parallax.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

const native = Platform.OS !== 'web';

type Star = { x: number; y: number; r: number; o: number };

// Small seeded generator so the sky looks the same on every render.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeStars(count: number, seed: number): Star[] {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => {
    const big = rand() > 0.92;
    return { x: rand(), y: rand(), r: big ? 0.9 + rand() * 0.7 : 0.35 + rand() * 0.5, o: 0.25 + rand() * (big ? 0.7 : 0.45) };
  });
}

const STILL = makeStars(170, 7);
const TWINKLE = [makeStars(14, 21), makeStars(14, 42), makeStars(14, 63)];

function StarLayer({ stars, w, h }: { stars: Star[]; w: number; h: number }) {
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {stars.map((s, i) => (
        <Circle key={i} cx={s.x * w} cy={s.y * h} r={s.r} fill="#FFFFFF" fillOpacity={s.o} />
      ))}
    </Svg>
  );
}

function Twinkle({ stars, w, h, period, delay }: { stars: Star[]; w: number; h: number; period: number; delay: number }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.2, duration: period / 2, easing: ease, useNativeDriver: native, delay }),
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: ease, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, period, delay]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: v }]}>
      <StarLayer stars={stars} w={w} h={h} />
    </Animated.View>
  );
}

export function StarSky({ drift }: { drift?: Animated.Value }) {
  const [size, setSize] = useState({ w: 390, h: 844 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('stars');
  const { w, h } = size;
  // The field is a bit wider than the screen so drifting never shows an edge.
  const fw = w * 1.2;
  const shift = useMemo(
    () => (drift ? drift.interpolate({ inputRange: [-400, 400], outputRange: [-24, 24], extrapolate: 'clamp' }) : 0),
    [drift],
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.sky]} onLayout={onLayout} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#000000" />
            <Stop offset={0.7} stopColor="#03040A" />
            <Stop offset={1} stopColor="#080A18" />
          </LinearGradient>
          <RadialGradient id={`${id}-band`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor="#8C9BD8" stopOpacity={0.09} />
            <Stop offset={1} stopColor="#8C9BD8" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}-bg)`} />
        {/* A faint hint of the Milky Way running across the sky. */}
        <Ellipse cx={w * 0.55} cy={h * 0.32} rx={w * 0.95} ry={h * 0.09} fill={`url(#${id}-band)`} transform={`rotate(-28 ${w * 0.55} ${h * 0.32})`} />
      </Svg>
      <Animated.View style={{ position: 'absolute', top: 0, left: -(fw - w) / 2, width: fw, height: h, transform: [{ translateX: shift }] }}>
        <StarLayer stars={STILL} w={fw} h={h} />
        {TWINKLE.map((stars, i) => (
          <Twinkle key={i} stars={stars} w={fw} h={h} period={2600 + i * 900} delay={i * 700} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { backgroundColor: '#000000' },
});
