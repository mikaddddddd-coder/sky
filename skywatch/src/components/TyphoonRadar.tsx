// A small radar for the Tonight card: the city at the centre, rings at half
// and full alert range, and the nearest cyclone placed by its real bearing and
// distance. A cyclone beyond the alert range sits faintly on the outer ring.
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../constants/theme';
import { bearingDeg } from '../lib/geo';
import type { CityReport } from '../lib/sky/report';
import { TYPHOON_ALERT_KM } from '../lib/sky/report';
import { useSvgId } from './useSvgId';

export function TyphoonRadar({ r, size = 104 }: { r: CityReport; size?: number }) {
  const id = useSvgId('radar');
  const c = size / 2;
  const outer = c - 8;
  const near = r.nearestCyclone;

  let marker: { x: number; y: number; inside: boolean } | null = null;
  if (near) {
    const b = (bearingDeg(r.city.latitude, r.city.longitude, near.cyclone.latitude, near.cyclone.longitude) * Math.PI) / 180;
    const inside = near.km <= TYPHOON_ALERT_KM;
    const d = (Math.min(near.km, TYPHOON_ALERT_KM) / TYPHOON_ALERT_KM) * outer;
    marker = { x: c + Math.sin(b) * d, y: c - Math.cos(b) * d, inside };
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={colors.typhoon} stopOpacity={0.55} />
            <Stop offset={1} stopColor={colors.typhoon} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={outer} stroke="rgba(255,255,255,0.28)" strokeWidth={1} fill="rgba(127,209,255,0.04)" />
        <Circle cx={c} cy={c} r={outer / 2} stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="2 3" fill="none" />
        <Line x1={c} y1={c - outer} x2={c} y2={c + outer} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        <Line x1={c - outer} y1={c} x2={c + outer} y2={c} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
        <Circle cx={c} cy={c} r={3} fill={colors.text} />

        {marker && (
          <>
            {marker.inside && <Circle cx={marker.x} cy={marker.y} r={16} fill={`url(#${id}-glow)`} />}
            {/* A two-armed swirl for the storm. */}
            <Path
              d={`M${marker.x - 6} ${marker.y}a6 6 0 0 1 6 -6M${marker.x + 6} ${marker.y}a6 6 0 0 1 -6 6`}
              stroke={colors.typhoon}
              strokeOpacity={marker.inside ? 1 : 0.45}
              strokeWidth={1.8}
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={marker.x} cy={marker.y} r={2} fill={colors.typhoon} fillOpacity={marker.inside ? 1 : 0.45} />
          </>
        )}
      </Svg>
    </View>
  );
}
