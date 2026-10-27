import { BlurView } from 'expo-blur';
import { useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
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
};

/** Frosted panel: blurs whatever sky is behind it, with a faint fill and hairline rim. */
export function Glass({ children, style, contentStyle, onPress, tone = 'light', radius = 28, sheen = false }: GlassProps) {
  const press = usePressScale();
  const body = (
    <View style={[styles.wrap, { borderRadius: radius }, sheen && styles.noRim, style]}>
      <BlurView intensity={sheen ? 80 : tone === 'light' ? 30 : 45} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: tone === 'light' ? colors.glassFill : colors.glassFillDark },
        ]}
      />
      {sheen && <Sheen radius={radius} />}
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
function Sheen({ radius }: { radius: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const id = useSvgId('sheen');
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="none">
      {size && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={size.h}>
              <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.28} />
              <Stop offset={0.25} stopColor="#FFFFFF" stopOpacity={0.08} />
              <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0.04} />
            </LinearGradient>
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
