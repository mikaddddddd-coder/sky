// Twilight scene for Venus: a glowing point placed by its real altitude and
// direction, a few faint stars, and a dark ridge along the horizon.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

const native = Platform.OS !== 'web';

const STARS = [
  [0.12, 0.12, 1.1], [0.3, 0.22, 0.8], [0.52, 0.08, 1], [0.7, 0.18, 0.7], [0.88, 0.1, 1.2],
  [0.2, 0.36, 0.7], [0.82, 0.32, 0.8], [0.44, 0.3, 0.6], [0.62, 0.4, 0.6], [0.06, 0.5, 0.7],
] as const;

function useTwinkle(period: number, delay: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, delay, easing: ease, useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: ease, useNativeDriver: native }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v, period, delay]);
  return v;
}

function Star({ x, y, r, i }: { x: number; y: number; r: number; i: number }) {
  const tw = useTwinkle(2600 + i * 370, i * 220);
  const opacity = tw.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.85] });
  return <Animated.View style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: '#FFFFFF', opacity }} />;
}

export function VenusSky({
  altitude,
  azimuth,
  morning,
  hiddenLabel,
}: {
  altitude: number;
  azimuth: number;
  morning: boolean;
  /** Shown at the horizon when Venus is below it. */
  hiddenLabel?: string;
}) {
  const [size, setSize] = useState({ w: 390, h: 420 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('venus');
  const glow = useTwinkle(3200, 300);
  const { w, h } = size;
  const horizon = h * 0.82;

  // Map the view: ±50° around due west (evening) or due east (morning), 0–45° up.
  const centre = morning ? 90 : 270;
  const dx = ((azimuth - centre + 540) % 360) - 180;
  const vx = w * (0.5 + Math.max(-0.42, Math.min(0.42, dx / 100)));
  const vy = horizon - (Math.max(-2, Math.min(45, altitude)) / 45) * (horizon - h * 0.12);
  const visible = altitude > 0;
  const halo = 46;
  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  const ridge = `M0 ${horizon} C ${w * 0.18} ${horizon - 18}, ${w * 0.32} ${horizon - 4}, ${w * 0.5} ${horizon - 14} S ${w * 0.82} ${horizon - 2}, ${w} ${horizon - 16} L ${w} ${h} L 0 ${h} Z`;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#0A0E2A" />
            <Stop offset={0.45} stopColor="#26305E" />
            <Stop offset={0.72} stopColor="#5B4C7E" />
            <Stop offset={0.86} stopColor="#C77F7A" />
            <Stop offset={1} stopColor="#E9A06E" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}-sky)`} />
      </Svg>

      {STARS.map(([sx, sy, r], i) => (
        <Star key={i} x={sx * w} y={sy * h} r={r} i={i} />
      ))}

      <Animated.View
        style={{
          position: 'absolute',
          left: vx - halo,
          top: vy - halo,
          width: halo * 2,
          height: halo * 2,
          opacity: visible ? haloOpacity : 0.35,
          transform: [{ scale }],
        }}
      >
        <Svg width={halo * 2} height={halo * 2}>
          <Defs>
            <RadialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset={0.08} stopColor="#FFF6DA" stopOpacity={1} />
              <Stop offset={0.25} stopColor="#FFE7A3" stopOpacity={0.35} />
              <Stop offset={1} stopColor="#FFE7A3" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo} cy={halo} r={halo} fill={`url(#${id}-glow)`} />
          {/* Faint diffraction spikes, like a bright point seen through the eye or a lens. */}
          <Path d={`M${halo} ${halo * 0.35} L${halo} ${halo * 1.65} M${halo * 0.35} ${halo} L${halo * 1.65} ${halo}`} stroke="#FFF6DA" strokeOpacity={0.55} strokeWidth={0.8} />
        </Svg>
      </Animated.View>

      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={ridge} fill="#0B0A18" />
      </Svg>

      {!visible && hiddenLabel && (
        <View style={[styles.hidden, { left: vx - 80, top: horizon - 52 }]}>
          <Text style={styles.hiddenText}>{hiddenLabel}</Text>
          <View style={styles.hiddenTick} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 160, alignItems: 'center', gap: 4 },
  hiddenText: { fontSize: 12, color: 'rgba(255,240,210,0.85)' },
  hiddenTick: { width: 1, height: 18, backgroundColor: 'rgba(255,240,210,0.6)' },
});
