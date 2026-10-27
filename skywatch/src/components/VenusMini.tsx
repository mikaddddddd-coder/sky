// A small twilight scene for the Tonight card: the horizon, the set sun's glow
// just below it, and Venus placed by its real angle from the Sun (sideways)
// and its altitude at its best moment (up). When Venus is lost in the glare
// or below the horizon it is drawn faint, so the picture says why.
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';
import type { VenusInfo } from '../lib/sky/astro';
import { useSvgId } from './useSvgId';

// Degrees shown across the scene: sideways from the Sun, and up from the horizon.
const MAX_ELONGATION = 48;
const MAX_ALTITUDE = 45;

function star(cx: number, cy: number, r: number) {
  const k = r * 0.28;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

export function VenusMini({ venus, width = 136, height = 104 }: { venus: VenusInfo; width?: number; height?: number }) {
  const id = useSvgId('venusmini');
  const horizon = height * 0.74;
  const glare = venus.highlight === 'nearSun' ? 44 : 36;
  // Far enough in that the sun's glow is never cut by the edge of the drawing.
  const sunX = glare + 2;
  const sunY = horizon + 6;
  const spanX = width - sunX - 14;
  const spanY = horizon - 14;

  const x = sunX + (Math.min(venus.elongation, MAX_ELONGATION) / MAX_ELONGATION) * spanX;
  const alt = Math.max(-8, Math.min(MAX_ALTITUDE, venus.altitudeAtBest));
  const y = horizon - (alt / MAX_ALTITUDE) * spanY;
  const visible = venus.highlight === 'good' || venus.highlight === 'low' || venus.highlight === 'morning';
  const bright = venus.highlight === 'good';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor="#FFB36B" stopOpacity={0.75} />
            <Stop offset={1} stopColor="#FF7A59" stopOpacity={0} />
          </RadialGradient>
          {/* User-space units: a flat line has no height for a bounding-box gradient. */}
          <LinearGradient id={`${id}-line`} gradientUnits="userSpaceOnUse" x1={0} y1={horizon} x2={width} y2={horizon}>
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset={0.2} stopColor="#FFFFFF" stopOpacity={0.4} />
            <Stop offset={0.8} stopColor="#FFFFFF" stopOpacity={0.4} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <ClipPath id={`${id}-sky`}>
            <Rect x={0} y={0} width={width} height={horizon} />
          </ClipPath>
          <RadialGradient id={`${id}-venus`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={colors.venus} stopOpacity={0.7} />
            <Stop offset={1} stopColor={colors.venus} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Afterglow of the set sun, cut off at the horizon. */}
        <G clipPath={`url(#${id}-sky)`}>
          <Circle cx={sunX} cy={sunY} r={glare} fill={`url(#${id}-sun)`} />
        </G>
        <Line x1={0} y1={horizon} x2={width} y2={horizon} stroke={`url(#${id}-line)`} strokeWidth={1} />

        {/* The path from the Sun up to Venus. */}
        <Line x1={sunX} y1={sunY} x2={x} y2={y} stroke="rgba(255,231,163,0.3)" strokeWidth={1} strokeDasharray="2 4" />

        {bright && <Circle cx={x} cy={y} r={18} fill={`url(#${id}-venus)`} />}
        <Path d={star(x, y, bright ? 9 : 7)} fill={colors.venus} fillOpacity={visible && alt > 0 ? 1 : 0.35} />
      </Svg>
    </View>
  );
}
