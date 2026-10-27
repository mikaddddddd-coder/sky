// Sun path from sunrise to sunset; the dot marks where the sun is now and the
// warm segment marks the last hour of daylight, when sunset glow builds.
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors } from '../constants/theme';

export function SunArc({ sunrise, sunset, now }: { sunrise: Date; sunset: Date; now: Date }) {
  const [w, setW] = useState(300);
  const h = 110;
  const pad = 18;
  const base = h - 12;
  const rx = (w - pad * 2) / 2;
  const ry = base - 14;
  const cx = w / 2;

  const span = sunset.getTime() - sunrise.getTime();
  const at = (t: number) => {
    const f = Math.min(1, Math.max(0, (t - sunrise.getTime()) / span));
    const a = Math.PI * (1 - f);
    return { x: cx + rx * Math.cos(a), y: base - ry * Math.sin(a) };
  };
  const arc = (from: number, to: number) => {
    const steps = 48;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const p = at(from + ((to - from) * i) / steps);
      d += `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }
    return d;
  };
  const golden = sunset.getTime() - 60 * 60_000;
  const sun = at(now.getTime());
  const isDay = now >= sunrise && now <= sunset;

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        <Line x1={pad - 8} y1={base} x2={w - pad + 8} y2={base} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        <Path d={arc(sunrise.getTime(), sunset.getTime())} stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} fill="none" />
        <Path d={arc(golden, sunset.getTime())} stroke={colors.glow} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {isDay && (
          <>
            <Circle cx={sun.x} cy={sun.y} r={11} fill="#FFD36B" fillOpacity={0.25} />
            <Circle cx={sun.x} cy={sun.y} r={6} fill="#FFD36B" />
          </>
        )}
      </Svg>
    </View>
  );
}
