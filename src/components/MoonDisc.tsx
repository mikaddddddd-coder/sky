// The moon for tonight: a full-moon photo (or a drawn fallback) with the real
// phase shaded over it. The terminator is feathered with a few stacked layers
// so the shadow fades in like the real thing instead of a hard edge.
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { MOON_PHOTO } from '../constants/assets';
import { useSvgId } from './useSvgId';

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

const C = 50;
const R = 48;

/** Unlit region for a given illumination, lit limb on the right (waxing). */
function shadowPath(illumination: number) {
  const k = Math.min(1, Math.max(0, illumination));
  const rx = Math.abs(1 - 2 * k) * R;
  const gibbous = k > 0.5 ? 1 : 0;
  return `M${C} ${C - R} A${R} ${R} 0 0 0 ${C} ${C + R} A${rx} ${R} 0 0 ${gibbous} ${C} ${C - R} Z`;
}

// Many faint layers spread across the terminator read as one soft gradient.
const FEATHER = Array.from({ length: 13 }, (_, i) => ({ dk: (i - 6) * 0.01, o: 0.092 }));

export function MoonDisc({ size, illumination, waxing }: { size: number; illumination: number; waxing: boolean }) {
  const flip = waxing ? undefined : 'translate(100 0) scale(-1 1)';
  const showShadow = illumination < 0.985;
  const id = useSvgId('moon');
  const layer = { position: 'absolute', left: 0, top: 0, width: size, height: size } as const;

  return (
    <View style={{ width: size, height: size }}>
      <View style={layer}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}-surface`} cx="42%" cy="38%" r="65%">
            <Stop offset={0} stopColor="#F4F2EC" />
            <Stop offset={0.7} stopColor="#C9C6BE" />
            <Stop offset={1} stopColor="#8E8B84" />
          </RadialGradient>
          <RadialGradient id={`${id}-halo`} cx="50%" cy="50%" r="50%">
            <Stop offset={0.9} stopColor="#FFF6E0" stopOpacity={0.22} />
            <Stop offset={1} stopColor="#FFF6E0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={C} cy={C} r={50} fill={`url(#${id}-halo)`} />
        {!MOON_PHOTO && (
          <>
            <Circle cx={C} cy={C} r={R} fill={`url(#${id}-surface)`} />
            <G>
              {MARIA.map((m, i) => (
                <Ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill="#4A4741" fillOpacity={m.o * 1.6} />
              ))}
            </G>
          </>
        )}
      </Svg>
      </View>

      {MOON_PHOTO && (
        // The photo is zoomed slightly inside a round clip so the dark sky
        // around the disc never shows as a rim.
        <View
          style={{ position: 'absolute', left: size * 0.02, top: size * 0.02, width: size * 0.96, height: size * 0.96, borderRadius: size, overflow: 'hidden' }}
        >
          <Image
            source={MOON_PHOTO}
            style={{ position: 'absolute', left: -size * 0.05, top: -size * 0.05, width: size * 1.06, height: size * 1.06 }}
          />
        </View>
      )}

      {showShadow && (
        <View style={layer}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <G transform={flip}>
              {FEATHER.map((f, i) => (
                <Path key={i} d={shadowPath(illumination + f.dk)} fill="#0B0A09" fillOpacity={f.o} />
              ))}
            </G>
          </Svg>
        </View>
      )}
    </View>
  );
}
