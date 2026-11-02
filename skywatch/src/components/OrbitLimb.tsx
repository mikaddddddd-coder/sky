// The edge of the Earth seen from orbit, curving up through a card's lower right corner,
// with a thin band of airglow along it and one meteor burning up below: the special
// events card's backdrop.
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useSvgId } from './useSvgId';

// Fractions of the card: the limb meets the bottom edge at LIMB_FOOT and the right edge at LIMB_TOP.
const LIMB_FOOT = 0.48;
const LIMB_TOP = 0.3;

export function OrbitLimb() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = useSvgId('limb');
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  let art = null;
  if (size) {
    const { w, h } = size;
    // A circle through (LIMB_FOOT·w, h) and (w, LIMB_TOP·h), centred down and to the right off the card.
    const ax = LIMB_FOOT * w;
    const ay = h;
    const bx = w;
    const by = LIMB_TOP * h;
    // Centre on the line x = w * 1.15, solved so both points sit on the circle.
    const cx = w * 1.15;
    const cy = ((bx - cx) ** 2 - (ax - cx) ** 2 + by ** 2 - ay ** 2) / (2 * (by - ay));
    const R = Math.hypot(ax - cx, ay - cy);
    // Distances out from the centre, as gradient offsets: ground darkening inward, the bright
    // blue rim, then the fainter orange and green airglow a little above it.
    const at = (d: number) => (R + d) / (R + 26);
    // The meteor: a short steep streak over the ground, its head lower left.
    const head = { x: w * 0.7, y: h * 0.9 };
    const tail = { x: w * 0.77, y: h * 0.58 };

    art = (
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={`${id}-earth`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={R + 26}>
            <Stop offset={at(-70)} stopColor="#0E1118" stopOpacity={0.6} />
            <Stop offset={at(-12)} stopColor="#2E3746" stopOpacity={0.5} />
            <Stop offset={at(-1)} stopColor="#46536A" stopOpacity={0.55} />
            <Stop offset={at(0.5)} stopColor="#6FA8FF" stopOpacity={0.45} />
            <Stop offset={at(5)} stopColor="#3D6FD0" stopOpacity={0.14} />
            <Stop offset={at(10)} stopColor="#C2783E" stopOpacity={0.12} />
            <Stop offset={at(15)} stopColor="#5E9A55" stopOpacity={0.08} />
            <Stop offset={1} stopColor="#5E9A55" stopOpacity={0} />
          </RadialGradient>
          {/* Sunlight scattering along the horizon where it climbs off the card. */}
          <RadialGradient id={`${id}-dawn`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor="#8EC0FF" stopOpacity={0.22} />
            <Stop offset={1} stopColor="#8EC0FF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}-meteor`} gradientUnits="userSpaceOnUse" x1={tail.x} y1={tail.y} x2={head.x} y2={head.y}>
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.7} stopColor="#FFF4E0" stopOpacity={0.45} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0.75} />
          </LinearGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={R + 26} fill={`url(#${id}-earth)`} />
        <Ellipse cx={w} cy={by} rx={w * 0.3} ry={h * 0.22} fill={`url(#${id}-dawn)`} />
        {/* A planet low over the limb. */}
        <Circle cx={w * 0.62} cy={h * 0.42} r={1.3} fill="#FFF6E6" fillOpacity={0.6} />
        <Streak from={tail} to={head} stroke={`url(#${id}-meteor)`} />
        <Circle cx={head.x} cy={head.y} r={1.2} fill="#FFFFFF" fillOpacity={0.8} />
      </Svg>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {art}
    </View>
  );
}

/** A streak drawn as a tapering stroke: wide line under a narrow bright core. */
function Streak({ from, to, stroke }: { from: { x: number; y: number }; to: { x: number; y: number }; stroke: string }) {
  return (
    <>
      <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={2.6} strokeOpacity={0.35} strokeLinecap="round" />
      <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
    </>
  );
}
