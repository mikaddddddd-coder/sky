import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Group, groupStyles, Row } from '../../components/GroupList';
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

export default function SettingsScreen() {
  const { settings, update, t, lang } = useSettings();
  const router = useRouter();
  // No payments yet: members can switch it back off to see the free app again.
  const openMember = () =>
    settings.member
      ? Alert.alert(t('memberTitle'), undefined, [
          { text: t('memberCancelDemo'), style: 'destructive', onPress: () => update({ member: false }) },
          { text: t('close'), style: 'cancel' },
        ])
      : router.push('/member');
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

          <Group>
            <Row icon={<SunsetIcon color={colors.glow} />} label={t('memberTitle')} onPress={openMember}>
              <Text style={[groupStyles.value, settings.member && { color: colors.glow }]}>{t(settings.member ? 'memberActive' : 'memberInactive')}</Text>
              <ChevronRightIcon color={colors.textDim} size={18} />
            </Row>
          </Group>

          <Group title={t('settingsGeneral')}>
            <Row icon={<GlobeIcon color={colors.text} />} label={t('settingsLanguage')} onPress={pickLanguage}>
              <Text style={groupStyles.value}>{langLabel(settings.language)}</Text>
              <ChevronRightIcon color={colors.textDim} size={18} />
            </Row>
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
});
