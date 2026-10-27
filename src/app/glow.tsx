import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { Glass } from '../components/Glass';
import { SceneBackground } from '../components/SceneBackground';
import { colors, spacing, type } from '../constants/theme';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

const POSITIVE = new Set(['canvas', 'clearWest', 'afterRain', 'clean']);

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, value))}%` }]} />
      </View>
      <Text style={styles.barValue}>{Math.round(value)}%</Text>
    </View>
  );
}

export default function GlowScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const g = r?.glow;

  return (
    <View style={styles.fill}>
      <SceneBackground scene="glow" />
      <SafeAreaView style={styles.fill}>
        {r && g && (
          <ScrollView contentContainerStyle={styles.content}>
            <Glass style={styles.panel}>
              <Text style={styles.eyebrow}>{t('glowDetailLead', { city: r.city.name[lang] })}</Text>
              <Text style={styles.headline}>{t('glowDetailTitle', { pct: g.score })}</Text>

              <View style={styles.reasons}>
                {g.reasons.map((reason) => (
                  <View key={reason} style={styles.reason}>
                    <View style={[styles.dot, { backgroundColor: POSITIVE.has(reason) ? colors.good : colors.bad }]} />
                    <Text style={styles.reasonText}>{t(`glow_reason_${reason}`)}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.section}>{t('glowCloudLayers')}</Text>
              <Bar label={t('glowLayerHigh')} value={g.inputs.localHigh} />
              <Bar label={t('glowLayerMid')} value={g.inputs.localMid} />
              <Bar label={t('glowLayerLow')} value={g.inputs.localLow} />
              <Bar label={t('glowWestLow')} value={g.inputs.westLow} />

              <Text style={styles.method}>{t('glowMethod')}</Text>
            </Glass>
          </ScrollView>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 120 },
  panel: {},
  eyebrow: { ...type.caption, color: 'rgba(255,255,255,0.8)' },
  headline: { fontSize: 32, fontWeight: '600', letterSpacing: -0.6, color: colors.text, marginBottom: spacing.sm },
  reasons: { gap: spacing.sm, marginBottom: spacing.md },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  reasonText: { ...type.body, fontSize: 16, color: colors.text, flex: 1 },
  section: { ...type.label, color: 'rgba(255,255,255,0.75)', marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...type.caption, color: colors.text, width: 92 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.text },
  barValue: { ...type.caption, color: colors.text, width: 38, textAlign: 'right', fontVariant: ['tabular-nums'] },
  method: { ...type.caption, color: 'rgba(255,255,255,0.75)', marginTop: spacing.md },
});
