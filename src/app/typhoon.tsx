import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { CycloneIcon } from '../components/Icons';
import { SceneBackground } from '../components/SceneBackground';
import { colors, spacing, type } from '../constants/theme';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

export default function TyphoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const ty = r?.typhoon;
  const level = ty?.cyclone.alertLevel;
  const levelLabel = level === 'green' || level === 'orange' || level === 'red' ? t(`alert_${level}`) : level;

  return (
    <View style={styles.fill}>
      <SceneBackground scene="typhoon" />
      <SafeAreaView style={[styles.fill, styles.content]}>
        {r && ty && (
          <>
            <View style={styles.top}>
              <View style={styles.badge}>
                <CycloneIcon color="#2F5FA8" size={30} />
              </View>
              <Text style={styles.meta}>
                {t('typhoonAlert', { level: levelLabel ?? '' })}
              </Text>
              {!!ty.cyclone.fromDate && <Text style={styles.meta}>{ty.cyclone.fromDate.slice(0, 10)}</Text>}
            </View>

            <View style={styles.bottom}>
              <Text style={styles.eyebrow}>{t('typhoonEyebrow')}</Text>
              <Text style={styles.headline}>{t('typhoonHeadline', { name: ty.cyclone.name, city: r.city.name[lang] })}</Text>
              <View style={styles.rule} />
              <View style={styles.figureRow}>
                <Text style={styles.figure}>{Math.round(ty.km)}</Text>
                <Text style={styles.unit}>km</Text>
              </View>
              <Text style={styles.eyebrow}>{t('typhoonDistance')}</Text>
            </View>
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
