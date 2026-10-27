// A living sunset sky drawn from the real forecast: high cirrus streaks, mid
// cloud bands and low cloud near the horizon appear in proportion to the
// cloud cover, lit in fire colours when a glow is likely and in greys when it
// is not. Everything drifts and breathes slowly over a deepening gradient.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

const native = Platform.OS !== 'web';
const ease = Easing.inOut(Easing.sin);

export type GlowWeather = {
  /** Cloud cover in percent overhead and toward the sunset. */
  high: number;
  mid: number;
  low: number;
  westLow: number;
  /** Chance of a glow, 0–100. */
  score: number;
  /** Precipitation probability, percent. */
  rain: number;
};

type Cloud = { x: number; y: number; w: number; h: number; color: string; opacity: number; drift: number; period: number };

// --- colour helpers -------------------------------------------------------

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * Math.min(1, Math.max(0, t))));
};
const mixStops = (a: string[], b: string[], t: number) => a.map((c, i) => mix(c, b[i], t));

// Sky gradients, top to horizon.
const VIVID = ['#3B3F7A', '#B0608E', '#F57E7A', '#FFB46E'];
const MUTED = ['#4A5378', '#8C86A6', '#C9A3A6', '#E8BC9C'];
const OVERCAST = ['#4E5262', '#767987', '#9A9AA3', '#B4AEAD'];

// --- cloud layouts ----------------------------------------------------------

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Layer = { count: number; band: [number, number]; w: [number, number]; h: [number, number]; color: string; opacity: number; seed: number };

function layout(layer: Layer): Cloud[] {
  const rand = seeded(layer.seed);
  return Array.from({ length: layer.count }, () => ({
    x: -0.35 + rand() * 0.9,
    y: layer.band[0] + rand() * (layer.band[1] - layer.band[0]),
    w: layer.w[0] + rand() * (layer.w[1] - layer.w[0]),
    h: layer.h[0] + rand() * (layer.h[1] - layer.h[0]),
    color: layer.color,
    opacity: layer.opacity * (0.75 + rand() * 0.25),
    drift: (rand() > 0.5 ? 1 : -1) * (0.05 + rand() * 0.1),
    period: 18000 + rand() * 16000,
  }));
}

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
  const opacity = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [c.opacity, c.opacity * 0.8, c.opacity] });
  const cw = c.w * w;
  const ch = c.h * h;
  return (
    <Animated.View style={{ position: 'absolute', left: c.x * w, top: c.y * h, width: cw, height: ch, opacity, transform: [{ translateX }] }}>
      <Svg width={cw} height={ch}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="55%" r="50%">
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

function Gradient({ id, stops, w, h }: { id: string; stops: string[]; w: number; h: number }) {
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map((c, i) => (
            <Stop key={i} offset={[0, 0.38, 0.72, 1][i]} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  );
}

// A typical glow evening, used until the forecast arrives.
const DEFAULT_WEATHER: GlowWeather = { high: 45, mid: 35, low: 10, westLow: 10, score: 70, rain: 0 };

/** `horizon` is where the sun sits, as a fraction of the sky's height. */
export function GlowSky({ horizon = 1, weather = DEFAULT_WEATHER }: { horizon?: number; weather?: GlowWeather }) {
  const [size, setSize] = useState({ w: 390, h: 360 });
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const id = useSvgId('glowsky');
  const deepen = useLoop(16000);
  const pulse = useLoop(5000, 600);
  const sunScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const { w, h } = size;
  const sunR = Math.min(w, h) * 0.09;

  const { high, mid, low, westLow, score, rain } = weather;
  const vivid = Math.min(1, score / 80);
  // Thick low or mid cloud turns the whole sky grey.
  const grey = Math.min(1, Math.max(0, (Math.max(low, mid * 0.8) - 55) / 40));
  const base = mixStops(mixStops(MUTED, VIVID, vivid), OVERCAST, grey);
  const deep = mixStops(base, ['#2E3168', '#C0608E', '#F06B6B', '#FF9E5E'], 0.6 * vivid);
  const sunOpacity = Math.max(0.12, 1 - (westLow / 100) * 0.85 - (low / 100) * 0.3 - grey * 0.4);
  const horizonY = h * horizon;
  const bankTop = horizonY - h * 0.12;
  const bankFade = Math.min(1, (h * 0.14) / Math.max(1, h - bankTop));

  const clouds = useMemo(() => {
    const lit = (dull: string, fire: string) => mix(dull, fire, vivid * (1 - grey));
    return [
      // High cirrus: long thin streaks, the first to catch the light.
      ...layout({ count: Math.round((high / 100) * 6), band: [0.04, 0.3], w: [0.8, 1.3], h: [0.035, 0.06], color: lit('#C8BAC7', '#FF9DB4'), opacity: 0.8, seed: 11 }),
      // Mid cloud: fuller bands lit orange from below.
      ...layout({ count: Math.round((mid / 100) * 5), band: [0.22, 0.45], w: [0.7, 1.1], h: [0.07, 0.12], color: lit('#A898A6', '#FF8A5B'), opacity: 0.85, seed: 23 }),
      // Low cloud: dark and heavy, close to the horizon.
      ...layout({ count: Math.round((low / 100) * 5), band: [0.36, 0.5], w: [0.6, 1.0], h: [0.08, 0.14], color: mix('#4F4458', '#6B4F5E', vivid), opacity: 0.85, seed: 37 }),
    ].map((c) => ({ ...c, y: c.y * (horizon / 0.5) }));
  }, [high, mid, low, vivid, grey, horizon]);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      <Gradient id={`${id}-a`} stops={base} w={w} h={h} />
      {/* A deeper palette fades in and out over the base sky, more strongly on a good evening. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: deepen.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }) }]}>
        <Gradient id={`${id}-b`} stops={deep} w={w} h={h} />
      </Animated.View>

      {/* Setting sun with a breathing halo, half below the horizon. */}
      <Animated.View
        style={{
          position: 'absolute',
          left: w * 0.62 - sunR * 3,
          top: horizonY - sunR * 3.4,
          width: sunR * 6,
          height: sunR * 6,
          opacity: sunOpacity,
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

      {clouds.map((c, i) => (
        <CloudBand key={i} c={c} w={w} h={h} index={i} />
      ))}

      {/* Low cloud toward the sunset: a dark bank sitting on the horizon. */}
      {westLow > 15 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}-bank`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#3B3145" stopOpacity={0} />
              <Stop offset={bankFade} stopColor="#3B3145" stopOpacity={Math.min(0.9, westLow / 100)} />
              <Stop offset={1} stopColor="#2C2536" stopOpacity={Math.min(0.95, westLow / 90)} />
            </LinearGradient>
          </Defs>
          {/* Runs to the bottom so nothing lighter shows between the bank and anything below it. */}
          <Rect x={0} y={bankTop} width={w} height={h - bankTop} fill={`url(#${id}-bank)`} />
        </Svg>
      )}

      {rain > 40 && <View style={[StyleSheet.absoluteFill, { backgroundColor: '#8D909C', opacity: ((rain - 40) / 60) * 0.35 }]} />}
    </View>
  );
}
