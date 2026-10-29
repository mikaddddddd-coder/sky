// Line icons drawn on a 24×24 grid with a shared stroke, so they read as one set.
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { size?: number; color: string };

const STROKE = 1.6;

function Frame({ size = 22, color, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function SunsetIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0" />
      <Path d="M12 6.5V8.5M5.2 9.7l1.4 1.4M18.8 9.7l-1.4 1.4M7 20.5h10" />
    </Frame>
  );
}

export function SparkleIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" />
      <Path d="M18.5 16.5v3M17 18h3" />
    </Frame>
  );
}

export function CycloneIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={2.2} />
      <Path d="M12 4.5c-4.5 0-7.5 3-7.5 7.5M12 19.5c4.5 0 7.5-3 7.5-7.5" />
      <Path d="M8 6.2C9.3 3.8 11.7 3 14 3M16 17.8C14.7 20.2 12.3 21 10 21" />
    </Frame>
  );
}

export function PinIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <Circle cx={12} cy={10} r={2.3} />
    </Frame>
  );
}

export function SlidersIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <Circle cx={15} cy={7} r={2} />
      <Circle cx={9} cy={17} r={2} />
    </Frame>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Frame>
  );
}

/**
 * The moon as it actually looks tonight: lit fraction and waxing/waning side.
 * The terminator is a half-ellipse whose width follows |1 − 2·illumination|.
 */
export function MoonPhaseIcon({ size = 22, color, illumination, waxing }: IconProps & { illumination: number; waxing: boolean }) {
  const r = 8.5;
  const c = 12;
  const rx = Math.abs(1 - 2 * illumination) * r;
  const gibbous = illumination > 0.5 ? 1 : 0;
  // Lit limb on the right (waxing, northern hemisphere), terminator back to the top.
  const lit = `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx} ${r} 0 0 ${gibbous} ${c} ${c - r} Z`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={STROKE} />
      <Path d={lit} fill={color} transform={waxing ? undefined : `translate(24 0) scale(-1 1)`} />
    </Svg>
  );
}

export function CloudIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.1 9.1 4.5 4.5 0 0 0 7 18Z" />
    </Frame>
  );
}

export function HighCloudIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M4 9h11M7 13h13M4 17h9" />
    </Frame>
  );
}

export function DropIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />
    </Frame>
  );
}

export function UmbrellaIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M3.5 12a8.5 8.5 0 0 1 17 0Z" />
      <Path d="M12 12v6.5a2 2 0 0 1-4 0" />
    </Frame>
  );
}

export function GlobeIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z" />
    </Frame>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M9.5 6l6 6-6 6" />
    </Frame>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M7 7l10 10M17 7L7 17" />
    </Frame>
  );
}

export function LocateIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={6.5} />
      <Circle cx={12} cy={12} r={2} />
      <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </Frame>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Circle cx={10.5} cy={10.5} r={6} />
      <Path d="M15 15l5 5" />
    </Frame>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M12 5.5v13M5.5 12h13" />
    </Frame>
  );
}

export function SunriseIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M3 17h18M6.5 17a5.5 5.5 0 0 1 11 0" />
      <Path d="M12 3.5v5M9.5 6l2.5-2.5L14.5 6M7 20.5h10" />
    </Frame>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z" />
      <Path d="M4 10.5h16M8.5 4v4M15.5 4v4" />
    </Frame>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5Z" />
      <Path d="M10 20.5a2 2 0 0 0 4 0" />
    </Frame>
  );
}

export function CompassIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M15.5 8.5 13.3 13.3 8.5 15.5 10.7 10.7Z" />
    </Frame>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Frame {...p}>
      <Path d="M6.5 11h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
      <Path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </Frame>
  );
}
