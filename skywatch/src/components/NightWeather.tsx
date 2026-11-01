// Night-time weather drawn over the starry sky: moonlit clouds that drift and
// thicken with cloud cover (each one a single soft shape built from puffs, not
// stacked translucent ovals), and a pale fog that thickens as visibility drops.
// Values fade rather than jump, so swiping between days feels continuous.
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

const native = Platform.OS !== 'web';
const MAX_CLOUDS = 8;
const BACK_THICKNESS: [number, number] = [0.07, 0.16];

/** A round lobe of a cloud: centre across the width and radius, both as fractions (radius of the height). */
type Puff = { x: number; r: number };
type CloudDef = { x: number; y: number; w: number; h: number; drift: number; period: number; op: number; puffs: Puff[] };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeClouds(seed: number, band: [number, number], thickness: [number, number]): CloudDef[] {
  const rand = seeded(seed);
  return Array.from({ length: MAX_CLOUDS }, () => ({
    x: -0.3 + rand() * 1.1,
    y: band[0] + rand() * (band[1] - band[0]),
    w: 0.6 + rand() * 0.6,
    h: thickness[0] + rand() * (thickness[1] - thickness[0]),
    drift: (rand() > 0.5 ? 1 : -1) * (0.08 + rand() * 0.12),
    period: 38000 + rand() * 30000,
    op: 0.7 + rand() * 0.3,
    puffs: makePuffs(rand),
  }));
}

/** Lobes along a flat base, biggest in the middle, so the outline reads as a cumulus. */
function makePuffs(rand: () => number): Puff[] {
  const n = 5 + Math.floor(rand() * 3);
  return Array.from({ length: n }, (_, i) => {
    const bell = Math.sin((Math.PI * (i + 0.5)) / n);
    return { x: 0.18 + (0.64 * i) / (n - 1) + (rand() - 0.5) * 0.06, r: 0.2 + 0.24 * bell + rand() * 0.06 };
  });
}

/** Fades an Animated value to `to` whenever it changes. */
function useFade(to: number, duration = 900) {
  const v = useRef(new Animated.Value(to)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: to, duration, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [v, to, duration]);
  return v;
}

function Cloud({ c, w, h, visible, index }: { c: CloudDef; w: number; h: number; visible: number; index: number }) {
  const id = useSvgId(`ncloud${index}`);
  const opacity = useFade(visible * c.op, 1200);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: c.period / 2, easing: ease, useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: c.period / 2, easing: ease, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, c.period]);
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, c.drift * w] });
  const cw = c.w * w;
  const ch = c.h * h;
  // Room around the shape for its blurred edge.
  const pad = ch * 0.3;
  const base = pad + ch * 0.8;
  const lobes = c.puffs.map((p) => {
    const cx = pad + p.x * cw;
    return { cx, r: Math.min(p.r * ch, cx, pad * 2 + cw - cx), cy: 0 };
  });
  lobes.forEach((l) => (l.cy = base - l.r * 0.55));
  const first = lobes[0];
  const last = lobes[lobes.length - 1];
  const belly = ch * 0.22;
  return (
    <Animated.View
      style={{ position: 'absolute', left: c.x * w - pad, top: c.y * h - pad, width: cw + pad * 2, height: ch + pad * 2, opacity, transform: [{ translateX }] }}
    >
      <Svg width={cw + pad * 2} height={ch + pad * 2}>
        <Defs>
          {/* Moonlight catches the top of the cloud; the underside stays a cool dark grey. */}
          <LinearGradient id={`${id}-fill`} x1={0} y1={pad} x2={0} y2={base} gradientUnits="userSpaceOnUse">
            <Stop offset={0} stopColor="#6E7590" />
            <Stop offset={0.55} stopColor="#43485E" />
            <Stop offset={1} stopColor="#262A3B" />
          </LinearGradient>
          {/* One blur over the whole outline: the lobes merge into a single soft body. */}
          <Filter id={`${id}-soft`} x="-30%" y="-60%" width="160%" height="220%">
            <FeGaussianBlur stdDeviation={ch * 0.055} />
          </Filter>
        </Defs>
        <G filter={`url(#${id}-soft)`} fill={`url(#${id}-fill)`}>
          {lobes.map((l, i) => (
            <Circle key={i} cx={l.cx} cy={l.cy} r={l.r} />
          ))}
          <Rect x={first.cx} y={base - belly} width={last.cx - first.cx} height={belly} rx={belly / 2} />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** Drifting clouds; `cover` 0–1 decides how many show. `band` limits them vertically (fractions of height). */
export function NightClouds({
  cover,
  width,
  height,
  seed,
  band = [0, 1],
  thickness = BACK_THICKNESS,
  strength = 1,
}: {
  cover: number;
  width: number;
  height: number;
  seed: number;
  band?: [number, number];
  thickness?: [number, number];
  strength?: number;
}) {
  const clouds = useMemo(() => makeClouds(seed, band, thickness), [seed, band, thickness]);
  const count = Math.round(cover * MAX_CLOUDS);
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width, height }} pointerEvents="none">
      {clouds.map((c, i) => (
        <Cloud key={i} c={c} w={width} h={height} visible={i < count ? strength * (0.25 + cover * 0.75) : 0} index={i + seed * 10} />
      ))}
    </View>
  );
}

/** A pale fog over the whole sky, heavier near the ground. `fog` 0–1. */
export function Fog({ fog }: { fog: number }) {
  const id = useSvgId('fog');
  const opacity = useFade(fog, 1200);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#9EA4B5" stopOpacity={0.28} />
            <Stop offset={0.6} stopColor="#A9AEBD" stopOpacity={0.45} />
            <Stop offset={1} stopColor="#B7BBC8" stopOpacity={0.65} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export { useFade };
