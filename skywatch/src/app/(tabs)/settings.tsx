import { Fragment, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRightIcon, CycloneIcon, GlobeIcon, SparkleIcon, SunsetIcon } from '../../components/Icons';
import { SceneBackground } from '../../components/SceneBackground';
import { colors, spacing, type } from '../../constants/theme';
import type { StringKey } from '../../lib/i18n/strings';
import { useSettings, type Settings } from '../../lib/settings';

const LANG_OPTIONS: { value: Settings['language']; label: string }[] = [
  { value: 'system', label: '' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const ALERTS: { key: keyof Settings['alerts']; title: StringKey; desc: StringKey; Icon: typeof SunsetIcon }[] = [
  { key: 'glow', title: 'alertGlow', desc: 'alertGlowDesc', Icon: SunsetIcon },
  { key: 'sky', title: 'alertSky', desc: 'alertSkyDesc', Icon: SparkleIcon },
  { key: 'typhoon', title: 'alertTyphoon', desc: 'alertTyphoonDesc', Icon: CycloneIcon },
];

/** A titled group of rows on one rounded panel, with hairlines between them. */
function Group({ title, footer, children }: { title: string; footer?: string; children: ReactNode[] }) {
  return (
    <View style={styles.groupWrap}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.group}>
        {children.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.divider} />}
            {child}
          </Fragment>
        ))}
      </View>
      {!!footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

/** One row: icon, label, then whatever sits on the right (a value, a switch). */
function Row({ icon, label, onPress, children }: { icon: ReactNode; label: string; onPress?: () => void; children?: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.right}>{children}</View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { settings, update, t, lang } = useSettings();
  const langLabel = (v: Settings['language']) => LANG_OPTIONS.find((o) => o.value === v)?.label || t('langSystem');

  const pickLanguage = () =>
    Alert.alert(t('settingsLanguage'), undefined, [
      ...LANG_OPTIONS.map((o) => ({ text: o.label || t('langSystem'), onPress: () => update({ language: o.value }) })),
      { text: t('close'), style: 'cancel' as const },
    ]);

  return (
    <View style={styles.safe}>
      <SceneBackground scene="night" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('tabSettings')}</Text>

          <Group title={t('settingsGeneral')}>
            {[
              <Row key="lang" icon={<GlobeIcon color={colors.text} />} label={t('settingsLanguage')} onPress={pickLanguage}>
                <Text style={styles.value}>{langLabel(settings.language)}</Text>
                <ChevronRightIcon color={colors.textDim} size={18} />
              </Row>,
            ]}
          </Group>

          <Group title={t('settingsAlerts')} footer={ALERTS.map((a) => `${t(a.title)}${lang === 'zh' ? '：' : ': '}${t(a.desc)}`).join('\n')}>
            {ALERTS.map(({ key, title, Icon }) => (
              <Row key={key} icon={<Icon color={colors.text} />} label={t(title)}>
                <Switch
                  value={settings.alerts[key]}
                  onValueChange={(v) => update({ alerts: { ...settings.alerts, [key]: v } })}
                  trackColor={{ true: colors.glow }}
                  thumbColor="#FFFFFF"
                />
              </Row>
            ))}
          </Group>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: 120 },
  title: { ...type.largeTitle, color: colors.text, marginTop: spacing.sm },
  groupWrap: { gap: spacing.sm + 2 },
  groupTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: colors.text, marginLeft: 2 },
  group: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: spacing.md + 2, gap: spacing.md },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  icon: { width: 24, alignItems: 'center' },
  label: { flex: 1, fontSize: 17, fontWeight: '500', color: colors.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 16, color: colors.textDim },
  footer: { ...type.caption, color: colors.textDim, marginHorizontal: spacing.xs, lineHeight: 19 },
});
