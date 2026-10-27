import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { SkyBackground } from '../../components/SkyBackground';
import { colors, radius, spacing, type } from '../../constants/theme';
import type { StringKey } from '../../lib/i18n/strings';
import { useSettings, type Settings } from '../../lib/settings';

const LANG_OPTIONS: { value: Settings['language']; label: string }[] = [
  { value: 'system', label: '' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const ALERTS: { key: keyof Settings['alerts']; title: StringKey; desc: StringKey }[] = [
  { key: 'glow', title: 'alertGlow', desc: 'alertGlowDesc' },
  { key: 'sky', title: 'alertSky', desc: 'alertSkyDesc' },
  { key: 'typhoon', title: 'alertTyphoon', desc: 'alertTyphoonDesc' },
];

export default function SettingsScreen() {
  const { settings, update, t } = useSettings();

  return (
    <SkyBackground phase="night">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('tabSettings')}</Text>

          <Text style={styles.section}>{t('settingsLanguage')}</Text>
          <View style={styles.segment}>
            {LANG_OPTIONS.map((o) => {
              const on = settings.language === o.value;
              return (
                <Pressable key={o.value} onPress={() => update({ language: o.value })} style={[styles.seg, on && styles.segOn]}>
                  <Text style={[styles.segText, on && styles.segTextOn]}>{o.label || t('langSystem')}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>{t('settingsAlerts')}</Text>
          <Card>
            {ALERTS.map((a) => (
              <View key={a.key} style={styles.alertRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{t(a.title)}</Text>
                  <Text style={styles.alertDesc}>{t(a.desc)}</Text>
                </View>
                <Switch
                  value={settings.alerts[a.key]}
                  onValueChange={(v) => update({ alerts: { ...settings.alerts, [a.key]: v } })}
                  trackColor={{ true: colors.glow }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { ...type.largeTitle, color: colors.text, marginVertical: spacing.sm },
  section: { ...type.label, color: colors.textDim, marginTop: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  seg: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md - 4, alignItems: 'center' },
  segOn: { backgroundColor: colors.glow },
  segText: { ...type.body, fontWeight: '500', color: colors.textDim },
  segTextOn: { color: '#1A0E1F' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  alertTitle: { ...type.headline, color: colors.text },
  alertDesc: { ...type.caption, color: colors.textDim },
});
