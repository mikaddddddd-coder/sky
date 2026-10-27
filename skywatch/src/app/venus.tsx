import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { Rise } from '../components/Motion';
import { VenusSky } from '../components/VenusSky';
import { colors, spacing, type } from '../constants/theme';
import { dirKey, formatTime } from '../lib/format';
import type { StringKey } from '../lib/i18n/strings';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

const SHEET = '#0B0A18';
// Typographic minus so negative altitudes don't read as a hyphen.
const signed = (n: number) => `${Math.round(n)}`.replace('-', '−');

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function VenusScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const v = r?.sky.venus;
  const morning = v?.visibility === 'morning';
  const clearance = useCloseButtonClearance();

  return (
    <View style={styles.fill}>
      <View style={styles.sky}>
        {v && (
          <VenusSky
            altitude={v.altitudeAtBest}
            azimuth={v.azimuthAtBest}
            morning={morning}
            hiddenLabel={t('venusBelowHorizon', { deg: Math.abs(Math.round(v.altitudeAtBest)) })}
          />
        )}
        <SafeAreaView edges={['top']} style={styles.skyText}>
          {v && (
            <Rise delay={150}>
              <Text style={styles.eyebrow}>{t(morning ? 'venusEyebrowMorning' : 'venusEyebrowEvening')}</Text>
              <Text style={styles.title}>{t('venusTitle')}</Text>
            </Rise>
          )}
        </SafeAreaView>
      </View>

      <View style={styles.sheet}>
        {r && v && (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false}>
            <Rise delay={250}>
              <Text style={styles.headline}>{t(`venus_highlight_${v.highlight}`)}</Text>
            </Rise>
            <Rise delay={380} style={styles.grid}>
              <Stat label={t('venusBestTime')} value={formatTime(v.bestTime, r.city.timezone, lang)} />
              <Stat label={t('venusAltitude')} value={`${signed(v.altitudeAtBest)}°`} />
              <Stat label={t('venusDirection')} value={t(dirKey(v.azimuthAtBest))} />
              <Stat label={t('venusBrightness')} value={v.magnitude.toFixed(1).replace('-', '−')} />
              <Stat label={t('venusPhase')} value={`${Math.round(v.phaseFraction * 100)}%`} />
              <Stat label={t('venusElongation')} value={`${Math.round(v.elongation)}°`} />
            </Rise>
            <Rise delay={480}>
              <Text style={styles.tip}>{t('venusTip')}</Text>
            </Rise>
          </ScrollView>
        )}
      </View>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SHEET },
  sky: { flex: 1, minHeight: 240, overflow: 'hidden' },
  skyText: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  eyebrow: { ...type.caption, color: 'rgba(255,255,255,0.7)' },
  title: { ...type.largeTitle, color: colors.text, marginTop: 2 },
  // Sized to its content, so the close button always has room below the text.
  sheet: { maxHeight: '62%', backgroundColor: SHEET },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  headline: { fontSize: 22, lineHeight: 30, fontWeight: '600', letterSpacing: -0.3, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  stat: { width: '33.33%', gap: 2 },
  statLabel: { ...type.caption, color: colors.textDim },
  statValue: { fontSize: 22, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  tip: { ...type.caption, color: colors.textDim },
});
