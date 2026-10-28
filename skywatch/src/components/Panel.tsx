// The frosted panel every detail scene sets its facts on: it picks up the sky
// at its top edge and darkens toward the bottom, so the text below reads cleanly.
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, type } from '../constants/theme';
import { Text } from './Text';

type Tint = readonly [string, string];

export function Panel({ children, tint, style }: { children: ReactNode; tint: Tint; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.panel, style]}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={tint} locations={[0, 0.35]} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

/** A label over a value, laid out two to a row. */
export function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={panelText.stat}>
      <Text style={panelText.statLabel}>{label}</Text>
      <Text style={panelText.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.lg,
    gap: spacing.lg,
  },
});

/** One type scale for every panel: title, a dim line under it, the big figure, section labels, stats. */
export const panelText = StyleSheet.create({
  eyebrow: { ...type.body, fontWeight: '500', color: colors.text, textShadowColor: 'rgba(20,10,30,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 },
  block: { gap: spacing.xs },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  hero: { fontSize: 68, lineHeight: 74, fontWeight: '300', letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 24, fontWeight: '300', color: colors.textDim, marginTop: 10, marginLeft: 4 },
  section: { ...type.label, color: colors.textDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  stat: { width: '50%', gap: 4, paddingRight: spacing.sm },
  statLabel: { ...type.caption, color: colors.textDim },
  statValue: { fontSize: 18, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },
  note: { ...type.caption, color: colors.textDim },
});
