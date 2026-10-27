// Sun path from sunrise to sunset; the dot marks where the sun is now and the
// warm segment marks the last hour of daylight, when sunset glow builds.
// The path is a gentle sine curve that dips just below the horizon at either
// end, like the sun's real track, so it meets the horizon at a slant.
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';
import { useProgress } from './Motion';
import { useSvgId } from './useSvgId';

// How far past sunrise/sunset the curve continues below the horizon, as a
// fraction of the day.
const NIGHT = 0.1;

export function SunArc({ sunrise, sunset, now, height = 116 }: { sunrise: Date; sunset: Date; now: Date; height?: number }) {
  const [w, setW] = useState(300);
  const travel = useProgress(1400, 300);
  const id = useSvgId('sunarc');
  const h = height;
  const pad = 6;
  const base = h - 26;
  const amp = base - 14;

  const start = sunrise.getTime();
  const span = sunset.getTime() - start;
  // f is the fraction of daylight elapsed; 0 at sunrise, 1 at sunset.
  const at = (f: number) => ({
    x: pad + ((f + NIGHT) / (1 + 2 * NIGHT)) * (w - pad * 2),
    y: base - amp * Math.sin(Math.PI * f),
  });
  const frac = (t: number) => (t - start) / span;
  const curve = (from: number, to: number) => {
    const steps = 64;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const p = at(from + ((to - from) * i) / steps);
      d += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return d;
  };

  const golden = frac(sunset.getTime() - 60 * 60_000);
  const nowF = Math.min(1 + NIGHT, Math.max(-NIGHT, frac(now.getTime()) * travel));
  const sun = at(nowF);
  const isDay = nowF >= 0 && nowF <= 1;
  const rise = at(0);
  const set = at(1);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.16} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Soft wash under the daylight part of the path. */}
        <Path d={`${curve(0, 1)}Z`} fill={`url(#${id}-fill)`} />

        <Path d={curve(-NIGHT, 0)} stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} strokeDasharray="2 4" fill="none" />
        <Path d={curve(1, 1 + NIGHT)} stroke="rgba(255,255,255,0.28)" strokeWidth={1.2} strokeDasharray="2 4" fill="none" />
        <Path d={curve(0, 1)} stroke="rgba(255,255,255,0.6)" strokeWidth={1.4} strokeLinecap="round" fill="none" />
        <Path d={curve(golden, 1)} stroke={colors.glow} strokeWidth={2.6} strokeLinecap="round" fill="none" />

        <Line x1={0} y1={base} x2={w} y2={base} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        <Circle cx={rise.x} cy={rise.y} r={2.2} fill="rgba(255,255,255,0.7)" />
        <Circle cx={set.x} cy={set.y} r={2.2} fill="rgba(255,255,255,0.7)" />

        <Circle cx={sun.x} cy={sun.y} r={13} fill="#FFD36B" fillOpacity={isDay ? 0.22 : 0.08} />
        <Circle cx={sun.x} cy={sun.y} r={6.5} fill={isDay ? '#FFD36B' : 'rgba(255,211,107,0.45)'} />
      </Svg>
    </View>
  );
}
