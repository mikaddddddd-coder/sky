// A rendered moon: shaded disc, maria, and the real terminator for tonight's phase.
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

// Rough positions of the main maria as seen from the northern hemisphere.
const MARIA = [
  { cx: 36, cy: 30, rx: 9, ry: 7, o: 0.1 },
  { cx: 42, cy: 36, rx: 6, ry: 5, o: 0.09 },
  { cx: 55, cy: 28, rx: 7, ry: 6, o: 0.09 },
  { cx: 60, cy: 40, rx: 8, ry: 6, o: 0.1 },
  { cx: 66, cy: 50, rx: 7, ry: 9, o: 0.08 },
  { cx: 30, cy: 48, rx: 5, ry: 10, o: 0.08 },
  { cx: 40, cy: 52, rx: 6, ry: 5, o: 0.07 },
  { cx: 50, cy: 58, rx: 5, ry: 4, o: 0.07 },
  { cx: 58, cy: 70, rx: 3, ry: 2.5, o: 0.12 },
  { cx: 45, cy: 76, rx: 2, ry: 2, o: 0.1 },
];

export function MoonDisc({ size, illumination, waxing }: { size: number; illumination: number; waxing: boolean }) {
  const c = 50;
  const r = 48;
  const rx = Math.abs(1 - 2 * illumination) * r;
  const gibbous = illumination > 0.5 ? 1 : 0;
  // Unlit part: the dark limb plus the terminator; lit limb is on the right while waxing.
  const shadow = `M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r} A${rx} ${r} 0 0 ${gibbous} ${c} ${c - r} Z`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="surface" cx="42%" cy="38%" r="65%">
          <Stop offset={0} stopColor="#F4F2EC" />
          <Stop offset={0.7} stopColor="#C9C6BE" />
          <Stop offset={1} stopColor="#8E8B84" />
        </RadialGradient>
        <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
          <Stop offset={0.9} stopColor="#FFF6E0" stopOpacity={0.25} />
          <Stop offset={1} stopColor="#FFF6E0" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={50} fill="url(#halo)" />
      <Circle cx={c} cy={c} r={r} fill="url(#surface)" />
      <G>
        {MARIA.map((m, i) => (
          <Ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill="#4A4741" fillOpacity={m.o * 1.6} />
        ))}
      </G>
      {illumination < 0.995 && (
        <Path d={shadow} fill="#0D0B0A" fillOpacity={0.88} transform={waxing ? undefined : 'translate(100 0) scale(-1 1)'} />
      )}
    </Svg>
  );
}
