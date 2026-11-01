import { BlurView } from 'expo-blur';
import { useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, spacing } from '../constants/theme';
import { usePressScale } from './Motion';
import { useSvgId } from './useSvgId';

type GlassProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Extra style for the padded inner area, e.g. `flex: 1` when the panel has a fixed height. */
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'light' | 'dark';
  radius?: number;
  /** Light the rim from above, brightest along the top edge, in place of the flat hairline. */
  sheen?: boolean;
  /** A soft coloured light inside the glass, giving the panel its own hue; also tints the rim. */
  aura?: Aura;
  /** A picture drawn inside the glass, under the rim light and the content. */
  backdrop?: ReactNode;
};

/** `x`/`y` place the light's centre as fractions of the panel; `strength` is 0–1. */
export type Aura = { color: string; x?: number; y?: number; strength?: number };

/** Frosted panel: blurs whatever sky is behind it, with a faint fill and hairline rim. */
export function Glass({ children, style, contentStyle, onPress, tone = 'light', radius = 28, sheen = false, aura, backdrop }: GlassProps) {
  const press = usePressScale();
  const body = (
    <View style={[styles.wrap, { borderRadius: radius }, sheen && styles.noRim, style]}>
      <BlurView intensity={sheen ? 45 : tone === 'light' ? 30 : 45} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          // With an aura the panel sits darker, so its own colour carries it rather than grey frosting.
          { borderRadius: radius, backgroundColor: aura ? colors.glassFillAura : tone === 'light' ? colors.glassFill : colors.glassFillDark },
        ]}
      />
      {backdrop}
      {(sheen || aura) && <Sheen radius={radius} aura={aura} />}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={{ transform: [{ scale: press.scale }] }}>{body}</Animated.View>
    </Pressable>
  );
}

/** A rim that catches light from above, plus a faint glint just inside the top edge. */
export function Sheen({ radius, aura }: { radius: number; aura?: Aura }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = useSvgId('sheen');
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const rim = aura?.color ?? '#FFFFFF';
  const strength = aura?.strength ?? 0.7;
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={size.h}>
              <Stop offset={0} stopColor={rim} stopOpacity={aura ? 0.4 : 0.28} />
              <Stop offset={0.25} stopColor={rim} stopOpacity={aura ? 0.14 : 0.08} />
              <Stop offset={1} stopColor={rim} stopOpacity={aura ? 0.1 : 0.04} />
            </LinearGradient>
            {aura && (
              <RadialGradient id={`${id}-aura`} cx="50%" cy="50%" r="50%">
                <Stop offset={0} stopColor={aura.color} stopOpacity={strength} />
                <Stop offset={0.45} stopColor={aura.color} stopOpacity={strength * 0.45} />
                <Stop offset={1} stopColor={aura.color} stopOpacity={0} />
              </RadialGradient>
            )}
            <LinearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.035} />
              <Stop offset={0.3} stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${id}-glint`} gradientUnits="userSpaceOnUse" x1={size.w * 0.3} y1={0} x2={size.w * 0.7} y2={0}>
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.32} />
              <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {aura && (
            <Ellipse
              cx={(aura.x ?? 0.8) * size.w}
              cy={(aura.y ?? 0.9) * size.h}
              rx={Math.max(size.w, size.h) * 0.75}
              ry={Math.max(size.w, size.h) * 0.6}
              fill={`url(#${id}-aura)`}
            />
          )}
          <Rect x={0} y={0} width={size.w} height={size.h} rx={radius} fill={`url(#${id}-wash)`} />
          <Rect x={0.5} y={0.5} width={size.w - 1} height={size.h - 1} rx={radius - 0.5} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={1} />
          <Line x1={size.w * 0.3} y1={1} x2={size.w * 0.7} y2={1} stroke={`url(#${id}-glint)`} strokeWidth={1} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  noRim: { borderWidth: 0 },
  content: { padding: spacing.md + 4, gap: spacing.sm },
});
