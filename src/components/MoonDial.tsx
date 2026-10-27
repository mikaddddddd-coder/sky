// Arc dial spanning moonrise to moonset with fine ticks; the bright tick is "now".
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { colors, type } from '../constants/theme';
import { useProgress } from './Motion';

export function MoonDial({ rise, set, now, label }: { rise: Date; set: Date; now: Date; label: (d: Date) => string }) {
  const [w, setW] = useState(340);
  const sweepIn = useProgress(1300, 500);
  const h = 120;
  const cx = w / 2;
  const r = w * 0.62;
  const cy = r + 26;
  const sweep = 0.9; // radians either side of vertical
  const span = set.getTime() - rise.getTime();
  const angleAt = (f: number) => -Math.PI / 2 - sweep + 2 * sweep * f;
  const pt = (a: number, rr: number) => ({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) });

  const ticks = [];
  for (let i = 0; i <= 90; i++) {
    const a = angleAt(i / 90);
    const long = i % 15 === 0;
    const p1 = pt(a, r);
    const p2 = pt(a, r - (long ? 12 : 6));
    ticks.push(
      <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.5)" strokeWidth={long ? 1.2 : 0.7} />,
    );
  }
  const f = (now.getTime() - rise.getTime()) / span;
  const nowVisible = f >= 0 && f <= 1;
  const nowA = angleAt(Math.min(1, Math.max(0, f)) * sweepIn);
  const n1 = pt(nowA, r + 4);
  const n2 = pt(nowA, r - 16);
  const a0 = pt(angleAt(0), r - 22);
  const a1 = pt(angleAt(1), r - 22);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={h}>
        <Path d={`M${a0.x} ${a0.y} A${r - 22} ${r - 22} 0 0 1 ${a1.x} ${a1.y}`} stroke="rgba(255,255,255,0.2)" strokeWidth={1} fill="none" />
        {ticks}
        {nowVisible && <Line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke={colors.moonTime} strokeWidth={2.4} strokeLinecap="round" />}
      </Svg>
      <View style={styles.labels}>
        <Text style={styles.label}>{label(rise)}</Text>
        <Text style={styles.label}>{label(set)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { position: 'absolute', top: 6, left: 4, right: 4, flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...type.caption, color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] },
});
