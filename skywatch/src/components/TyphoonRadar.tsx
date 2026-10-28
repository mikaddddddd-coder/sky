// A small radar for the Tonight card: the city at the centre, rings at quarter,
// half and full alert range, and the nearest cyclone placed by its real bearing
// and distance. A beam sweeps toward the storm and a dashed track joins it to
// the city. A cyclone beyond the alert range sits faintly on the outer ring.
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';
import { bearingDeg } from '../lib/geo';
import type { CityReport } from '../lib/sky/report';
import { TYPHOON_ALERT_KM } from '../lib/sky/report';
import { useSvgId } from './useSvgId';

// Where the beam rests when there is no storm to point at.
const IDLE_BEARING = 45;

/** Point at `deg` (clockwise from north) and `dist` from the centre. */
function polar(c: number, deg: number, dist: number) {
  const a = (deg * Math.PI) / 180;
  return { x: c + Math.sin(a) * dist, y: c - Math.cos(a) * dist };
}

/** A pie slice from the centre, `from`→`to` degrees clockwise. */
function wedge(c: number, r: number, from: number, to: number) {
  const a = polar(c, from, r);
  const b = polar(c, to, r);
  return `M${c} ${c}L${a.x} ${a.y}A${r} ${r} 0 0 1 ${b.x} ${b.y}Z`;
}

/** Three curved arms spiralling into the eye, like a satellite picture of a storm. */
function swirl(x: number, y: number, r: number) {
  return [0, 120, 240]
    .map((rot) => {
      const start = polar(0, rot, r);
      const ctrl = polar(0, rot + 70, r * 0.95);
      const end = polar(0, rot + 130, r * 0.3);
      return `M${x + start.x} ${y + start.y}Q${x + ctrl.x} ${y + ctrl.y} ${x + end.x} ${y + end.y}`;
    })
    .join('');
}

export function TyphoonRadar({ r, size = 104 }: { r: CityReport; size?: number }) {
  const id = useSvgId('radar');
  const c = size / 2;
  const outer = c - 4;
  const near = r.nearestCyclone;

  const bearing = near ? bearingDeg(r.city.latitude, r.city.longitude, near.cyclone.latitude, near.cyclone.longitude) : IDLE_BEARING;
  const inside = !!near && near.km <= TYPHOON_ALERT_KM;
  const marker = near ? polar(c, bearing, (Math.min(near.km, TYPHOON_ALERT_KM) / TYPHOON_ALERT_KM) * outer) : null;
  const ink = colors.typhoon;
  const strength = inside ? 1 : 0.5;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          {/* The scope: faintly lit from the centre, darker toward the rim. */}
          <RadialGradient id={`${id}-face`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={ink} stopOpacity={0.16} />
            <Stop offset={0.7} stopColor={ink} stopOpacity={0.05} />
            <Stop offset={1} stopColor={ink} stopOpacity={0.12} />
          </RadialGradient>
          <RadialGradient id={`${id}-beam`} cx={c} cy={c} r={outer} gradientUnits="userSpaceOnUse">
            <Stop offset={0} stopColor={ink} stopOpacity={0} />
            <Stop offset={1} stopColor={ink} stopOpacity={0.4 * strength} />
          </RadialGradient>
          <RadialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={ink} stopOpacity={0.75 * strength} />
            <Stop offset={0.4} stopColor={ink} stopOpacity={0.25 * strength} />
            <Stop offset={1} stopColor={ink} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-city`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.5} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={outer} fill={`url(#${id}-face)`} />

        {/* The beam fades behind its leading edge, which points at the storm. */}
        <Path d={wedge(c, outer, bearing - 55, bearing)} fill={`url(#${id}-beam)`} opacity={0.35} />
        <Path d={wedge(c, outer, bearing - 22, bearing)} fill={`url(#${id}-beam)`} opacity={0.7} />
        {(() => {
          const tip = polar(c, bearing, outer);
          return <Line x1={c} y1={c} x2={tip.x} y2={tip.y} stroke={ink} strokeOpacity={0.55 * strength} strokeWidth={1} />;
        })()}

        <Circle cx={c} cy={c} r={outer} stroke="rgba(255,255,255,0.32)" strokeWidth={1} fill="none" />
        <Circle cx={c} cy={c} r={outer / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="2 3" fill="none" />
        <Circle cx={c} cy={c} r={outer / 4} stroke="rgba(255,255,255,0.1)" strokeWidth={1} fill="none" />
        <Line x1={c} y1={c - outer} x2={c} y2={c + outer} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Line x1={c - outer} y1={c} x2={c + outer} y2={c} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        {/* Ticks round the rim every 15°, longer at the compass points. */}
        <G>
          {Array.from({ length: 24 }, (_, i) => {
            const deg = i * 15;
            const major = deg % 90 === 0;
            const a = polar(c, deg, outer);
            const b = polar(c, deg, outer - (major ? 7 : 3.5));
            return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFFFFF" strokeOpacity={major ? 0.45 : 0.2} strokeWidth={1} />;
          })}
        </G>

        {/* The city: a bright point with a soft halo. */}
        <Circle cx={c} cy={c} r={9} fill={`url(#${id}-city)`} />
        <Circle cx={c} cy={c} r={3} fill={colors.text} />

        {marker && (
          <>
            <Line x1={c} y1={c} x2={marker.x} y2={marker.y} stroke={ink} strokeOpacity={0.5 * strength} strokeWidth={1} strokeDasharray="2 3" />
            <Circle cx={marker.x} cy={marker.y} r={22} fill={`url(#${id}-glow)`} />
            <Path d={swirl(marker.x, marker.y, 9)} stroke={ink} strokeOpacity={strength} strokeWidth={2} strokeLinecap="round" fill="none" />
            <Circle cx={marker.x} cy={marker.y} r={2.4} fill="#FFFFFF" fillOpacity={strength} />
          </>
        )}
      </Svg>
    </View>
  );
}
