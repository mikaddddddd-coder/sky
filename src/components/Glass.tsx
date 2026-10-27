import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing } from '../constants/theme';

type GlassProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: 'light' | 'dark';
  radius?: number;
};

/** Frosted panel: blurs whatever sky is behind it, with a faint fill and hairline rim. */
export function Glass({ children, style, onPress, tone = 'light', radius = 28 }: GlassProps) {
  const body = (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      <BlurView intensity={tone === 'light' ? 30 : 45} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: tone === 'light' ? colors.glassFill : colors.glassFillDark },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  content: { padding: spacing.md + 4, gap: spacing.sm },
});
