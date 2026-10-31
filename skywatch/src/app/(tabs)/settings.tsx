import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Group, groupStyles, Row } from '../../components/GroupList';
import { BellIcon, ChevronRightIcon, CloudIcon, CycloneIcon, GlobeIcon, LockIcon, SlidersIcon, SparkleIcon, SunsetIcon, TimerIcon } from '../../components/Icons';
import { SceneBackground } from '../../components/SceneBackground';
import { colors, spacing, type } from '../../constants/theme';
import type { StringKey } from '../../lib/i18n/strings';
import { glowAlertFor, PAYMENTS_ENABLED, useSettings, type GlowAlert, type Settings } from '../../lib/settings';

const PRIVACY_URL = 'https://lookup.minxi.work/privacy';

const LANG_OPTIONS: { value: Settings['language']; label: string }[] = [
  { value: 'system', label: '' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const ALERTS: { key: keyof Settings['alerts']; title: StringKey; desc: StringKey; Icon: typeof SunsetIcon }[] = [
  { key: 'glow', title: 'alertGlow', desc: 'alertGlowDesc', Icon: SunsetIcon },
  { key: 'sky', title: 'alertSky', desc: 'alertSkyDesc', Icon: SparkleIcon },
  { key: 'typhoon', title: 'alertTyphoon', desc: 'alertTyphoonDesc', Icon: CycloneIcon },
  { key: 'island', title: 'alertIsland', desc: 'alertIslandDesc', Icon: TimerIcon },
];

const LEVELS: { value: GlowAlert['level']; label: StringKey }[] = [
  { value: 'fire', label: 'alertLevelFire' },
  { value: 'good', label: 'alertLevelGood' },
];
const LEADS: GlowAlert['leadMin'][] = [60, 120, 180];

export default function SettingsScreen() {
  const { settings, update, t, lang } = useSettings();
  const router = useRouter();
  // No payments yet: members can switch it back off to see the free app again.
  const openMember = () =>
    settings.member
      ? Alert.alert(t('memberTitle'), undefined, [
          { text: t('memberCancelDemo'), style: 'destructive', onPress: () => update({ member: false, guideTaste: null }) },
          { text: t('close'), style: 'cancel' },
        ])
      : router.push('/member');
  const langLabel = (v: Settings['language']) => LANG_OPTIONS.find((o) => o.value === v)?.label || t('langSystem');

  const pickLanguage = () =>
    Alert.alert(t('settingsLanguage'), undefined, [
      ...LANG_OPTIONS.map((o) => ({ text: o.label || t('langSystem'), onPress: () => update({ language: o.value }) })),
      { text: t('close'), style: 'cancel' as const },
    ]);

  // Members pick which glows earn an alert and how early; for everyone else the rows show the
  // defaults behind a lock and lead to the offer.
  const glowAlert = glowAlertFor(settings);
  const setGlowAlert = (patch: Partial<GlowAlert>) => update({ glowAlert: { ...settings.glowAlert, ...patch } });
  const leadLabel = (m: number) => t('alertLeadHours', { h: m / 60 });
  const pickLevel = () =>
    settings.member
      ? Alert.alert(t('alertLevel'), undefined, [
          ...LEVELS.map((o) => ({ text: t(o.label), onPress: () => setGlowAlert({ level: o.value }) })),
          { text: t('close'), style: 'cancel' as const },
        ])
      : router.push('/member');
  const pickLead = () =>
    settings.member
      ? Alert.alert(t('alertLead'), undefined, [
          ...LEADS.map((m) => ({ text: leadLabel(m), onPress: () => setGlowAlert({ leadMin: m }) })),
          { text: t('close'), style: 'cancel' as const },
        ])
      : router.push('/member');
  const memberValue = (text: string) => (
    <>
      {!settings.member && <LockIcon color={colors.textDim} size={15} />}
      <Text style={groupStyles.value}>{text}</Text>
      <ChevronRightIcon color={colors.textDim} size={18} />
    </>
  );

  return (
    <View style={styles.safe}>
      <SceneBackground scene="night" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('tabSettings')}</Text>

          {PAYMENTS_ENABLED && (
            <Group>
              <Row icon={<SunsetIcon color={colors.glow} />} label={t('memberTitle')} onPress={openMember}>
                <Text style={[groupStyles.value, settings.member && { color: colors.glow }]}>{t(settings.member ? 'memberActive' : 'memberInactive')}</Text>
                <ChevronRightIcon color={colors.textDim} size={18} />
              </Row>
            </Group>
          )}

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
                  value={settings.alerts[key] !== false}
                  onValueChange={(v) => update({ alerts: { ...settings.alerts, [key]: v } })}
                  trackColor={{ true: colors.glow }}
                  thumbColor="#FFFFFF"
                />
              </Row>
            ))}
          </Group>

          {settings.alerts.glow && (
            <Group title={t('alertGlowOptions')} footer={t('alertGlowOptionsNote')}>
              <Row icon={<SlidersIcon color={colors.text} />} label={t('alertLevel')} onPress={pickLevel}>
                {memberValue(t(LEVELS.find((o) => o.value === glowAlert.level)!.label))}
              </Row>
              <Row icon={<BellIcon color={colors.text} />} label={t('alertLead')} onPress={pickLead}>
                {memberValue(leadLabel(glowAlert.leadMin))}
              </Row>
            </Group>
          )}

          {/* Not an alert but a favour asked of the user, so it gets its own group, worded as consent. */}
          <Group title={t('settingsImprove')} footer={t('improveNote')}>
            <Row icon={<CloudIcon color={colors.text} />} label={t('improveAsk')}>
              <Switch
                value={settings.alerts.feedback !== false}
                onValueChange={(v) => update({ alerts: { ...settings.alerts, feedback: v } })}
                trackColor={{ true: colors.glow }}
                thumbColor="#FFFFFF"
              />
            </Row>
          </Group>

          <Group title={t('settingsAbout')} footer={`${t('aboutData')}\n${t('aboutDataNote')}`}>
            <Row icon={<GlobeIcon color={colors.text} />} label={t('aboutPrivacy')} onPress={() => Linking.openURL(PRIVACY_URL)}>
              <ChevronRightIcon color={colors.textDim} size={18} />
            </Row>
          </Group>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: 120 },
  title: { ...type.largeTitle, fontSize: 26, color: colors.text, marginTop: spacing.sm },
});
