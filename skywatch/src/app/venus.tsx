import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { Rise } from '../components/Motion';
import { Panel, PanelStat, panelText } from '../components/Panel';
import { VenusSky } from '../components/VenusSky';
import { colors, spacing } from '../constants/theme';
import { dirKey, formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

const SHEET = '#0B0A18';
const LEVEL_COLOR = { excellent: colors.good, good: '#FFC39A', fair: colors.text, poor: colors.text } as const;
// Typographic minus so negative altitudes don't read as a hyphen.
const signed = (n: number) => `${Math.round(n)}`.replace('-', '−');

export default function VenusScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const v = r?.sky.venus;
  const morning = v?.visibility === 'morning';
  const clearance = useCloseButtonClearance();

  const date =
    r &&
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, month: 'short', day: 'numeric', weekday: 'short' }).format(
      new Date(),
    );

  return (
    <View style={styles.root}>
      {/* The sky keeps its own frame, so Venus sits where the drawing puts its horizon. */}
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
          {r && v && (
            <Rise delay={150}>
              <Text style={panelText.eyebrow}>
                {t('venusTitle')} · {r.city.name[lang]} · {date}
              </Text>
            </Rise>
          )}
        </SafeAreaView>
      </View>

      {r && v && (
        <Rise delay={200} style={[styles.panelWrap, { marginBottom: clearance - spacing.md }]}>
          <Panel tint={['rgba(40,30,80,0.14)', 'rgba(10,9,24,0.78)']} style={styles.panel}>
            <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
              <View style={panelText.block}>
                <Text style={[panelText.title, { color: LEVEL_COLOR[v.level] }]}>{t(`venusLevel_${v.level}`)}</Text>
                <Text style={panelText.sub}>{t(morning ? 'venusEyebrowMorning' : 'venusEyebrowEvening')}</Text>
                <Text style={panelText.hero}>{formatTime(v.bestTime, r.city.timezone, lang)}</Text>
                <Text style={panelText.sub}>
                  {t('venusBestTime')} · {t(`venus_highlight_${v.highlight}`)}
                </Text>
              </View>

              <View style={panelText.grid}>
                <PanelStat label={t('venusAltitude')} value={`${signed(v.altitudeAtBest)}°`} />
                <PanelStat label={t('venusDirection')} value={t(dirKey(v.azimuthAtBest))} />
                <PanelStat label={t('venusBrightness')} value={v.magnitude.toFixed(1).replace('-', '−')} />
                <PanelStat label={t('venusPhase')} value={`${Math.round(v.phaseFraction * 100)}%`} />
                <PanelStat label={t('venusElongation')} value={`${Math.round(v.elongation)}°`} />
              </View>

              <View style={panelText.divider} />
              <Text style={panelText.note}>{t('venusTip')}</Text>
            </ScrollView>
          </Panel>
        </Rise>
      )}
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHEET },
  sky: { flex: 1, minHeight: 240, overflow: 'hidden' },
  skyText: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  // Sized to its content up to a cap, so the sky above always keeps room.
  panelWrap: { maxHeight: '58%', marginHorizontal: spacing.md, marginTop: -spacing.xl },
  panel: { padding: 0, gap: 0, flexShrink: 1 },
  panelContent: { padding: spacing.lg, gap: spacing.lg },
});
