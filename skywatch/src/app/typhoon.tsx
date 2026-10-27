import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { CycloneIcon } from '../components/Icons';
import { Rise, useCountUp } from '../components/Motion';
import { SceneBackground } from '../components/SceneBackground';
import { colors, spacing, type } from '../constants/theme';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

export default function TyphoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  // A cyclone inside the alert radius is the story; otherwise show the calm state
  // and, if there is one, the nearest cyclone further out.
  const near = r?.typhoon ?? null;
  const shown = near ?? r?.nearestCyclone ?? null;
  const km = useCountUp(shown ? Math.round(shown.km) : 0, 1100, 450);
  const level = near?.cyclone.alertLevel;
  const levelLabel = level === 'green' || level === 'orange' || level === 'red' ? t(`alert_${level}`) : level;
  const cityName = r?.city.name[lang] ?? '';

  return (
    <View style={styles.fill}>
      <SceneBackground scene="typhoon" fadeIn />
      <SafeAreaView style={[styles.fill, styles.content]}>
        {r && (
          <>
            <Rise style={styles.top}>
              <View style={styles.badge}>
                <CycloneIcon color="#2F5FA8" size={30} />
              </View>
              {near ? (
                <>
                  <Text style={styles.meta}>{t('typhoonAlert', { level: levelLabel ?? '' })}</Text>
                  {!!near.cyclone.fromDate && <Text style={styles.meta}>{near.cyclone.fromDate.slice(0, 10)}</Text>}
                </>
              ) : (
                <Text style={styles.meta}>{t('typhoonCalmBody', { city: cityName })}</Text>
              )}
            </Rise>

            <Rise delay={250} distance={24} style={styles.bottom}>
              <Text style={styles.eyebrow}>{t('typhoonEyebrow')}</Text>
              <Text style={styles.headline}>
                {near ? t('typhoonHeadline', { name: near.cyclone.name, city: cityName }) : t('typhoonCalmTitle')}
              </Text>
              <View style={styles.rule} />
              {shown ? (
                <>
                  <View style={styles.figureRow}>
                    <Text style={styles.figure}>{km}</Text>
                    <Text style={styles.unit}>km</Text>
                  </View>
                  <Text style={styles.eyebrow}>
                    {near ? t('typhoonDistance') : t('typhoonNearestFar', { name: shown.cyclone.name, km: Math.round(shown.km) })}
                  </Text>
                </>
              ) : (
                <Text style={styles.eyebrow}>{t('typhoonNoneActive')}</Text>
              )}
            </Rise>
          </>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  top: { paddingTop: spacing.lg, gap: spacing.sm },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(240,246,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  meta: { ...type.body, fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  bottom: { paddingBottom: 110, gap: spacing.sm },
  eyebrow: { ...type.body, fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  headline: { fontSize: 30, lineHeight: 38, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  rule: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.85)', marginVertical: spacing.md },
  figureRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  figure: { fontSize: 76, lineHeight: 80, fontWeight: '500', letterSpacing: -2, color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 22, fontWeight: '500', color: colors.text, marginBottom: 10 },
});
