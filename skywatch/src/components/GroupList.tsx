// Grouped rows on rounded panels, as on the Settings and Cities screens.
import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, type } from '../constants/theme';
import { Sheen } from './Glass';
import { Text } from './Text';

/** An optionally titled group of rows on one rounded panel, with hairlines between them. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children);
  if (!rows.length) return null;
  return (
    <View style={styles.wrap}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.group}>
        {rows.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </Fragment>
        ))}
        <Sheen radius={GROUP_RADIUS} />
      </View>
      {!!footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

/** One row: icon, label (with an optional dim line under it), then whatever sits on the right. */
export function Row({
  icon,
  label,
  sub,
  onPress,
  children,
}: {
  icon?: ReactNode;
  label: string;
  sub?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {!!icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {!!sub && (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      <View style={styles.right}>{children}</View>
    </Pressable>
  );
}

const GROUP_RADIUS = 22;

export const groupStyles = StyleSheet.create({
  /** The rounded panel on its own, for things like a search field. */
  panel: {
    borderRadius: GROUP_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  value: { fontSize: 14, color: colors.textDim },
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2, color: colors.text, marginLeft: 2 },
  // The rim light stands in for the hairline border, as on the Tonight cards.
  group: { ...groupStyles.panel, borderWidth: 0 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm + 4 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  icon: { width: 24, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '500', color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { ...type.caption, fontSize: 11, lineHeight: 16, color: colors.textDim, marginHorizontal: spacing.xs },
});
