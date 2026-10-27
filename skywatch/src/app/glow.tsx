import { BlurView } from 'expo-blur';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { GlowSky } from '../components/GlowSky';
import { easeOut, Rise, useCountUp } from '../components/Motion';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

const POSITIVE = new Set(['canvas', 'clearWest', 'afterRain', 'clean']);
const SHEET = '#1A1322';

function Bar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const grow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(grow, { toValue: 1, duration: 900, delay, easing: easeOut, useNativeDriver: false }).start();
  }, [grow, delay]);
  const width = grow.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(2, Math.min(100, value))}%`] });
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width }]} />
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
  const shown = useCountUp(g?.score ?? 0, 1000, 300);
  const clearance = useCloseButtonClearance();
  const { height } = useWindowDimensions();
  // The sun sits on the sheet's top edge, wherever the sheet ends up.
  const [sheetTop, setSheetTop] = useState(height * 0.5);

  return (
    <View style={styles.fill}>
      <GlowSky
        horizon={Math.min(0.8, (sheetTop + 20) / height)}
        weather={
          g
            ? {
                high: g.inputs.localHigh,
                mid: g.inputs.localMid,
                low: g.inputs.localLow,
                westLow: g.inputs.westLow,
                score: g.score,
                rain: g.inputs.precipProbability,
              }
            : undefined
        }
      />
      <View style={styles.sky}>
        <SafeAreaView edges={['top']} style={styles.skyText}>
          {r && g && (
            <Rise delay={150}>
              <Text style={styles.eyebrow}>
                {r.city.name[lang]} · {t('sunset')} {formatTime(r.sky.sun.sunset, r.city.timezone, lang)}
              </Text>
              <View style={styles.figureRow}>
                <Text style={styles.figure}>{shown}</Text>
                <Text style={styles.unit}>%</Text>
              </View>
              <Text style={styles.caption}>
                {t('glowTitle')} · {t(`level_${g.level}`)}
              </Text>
            </Rise>
          )}
        </SafeAreaView>
      </View>

      <View style={styles.sheet} onLayout={(e) => setSheetTop(e.nativeEvent.layout.y)}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.sheetTint]} />
        {r && g && (
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false}>
            <Rise delay={250}>
              <Text style={styles.headline}>{t('glowDetailTitle', { pct: g.score })}</Text>
            </Rise>
            <View style={styles.reasons}>
              {g.reasons.map((reason, i) => (
                <Rise key={reason} delay={350 + i * 90} style={styles.reason}>
                  <View style={[styles.dot, { backgroundColor: POSITIVE.has(reason) ? colors.good : colors.bad }]} />
                  <Text style={styles.reasonText}>{t(`glow_reason_${reason}`)}</Text>
                </Rise>
              ))}
            </View>

            <Text style={styles.section}>{t('glowCloudLayers')}</Text>
            <Bar label={t('glowLayerHigh')} value={g.inputs.localHigh} delay={500} />
            <Bar label={t('glowLayerMid')} value={g.inputs.localMid} delay={580} />
            <Bar label={t('glowLayerLow')} value={g.inputs.localLow} delay={660} />
            <Bar label={t('glowWestLow')} value={g.inputs.westLow} delay={740} />

            <Text style={styles.method}>{t('glowMethod')}</Text>
          </ScrollView>
        )}
      </View>
      <CloseButton />
    </View>
  );
}

const textShadow = { textShadowColor: 'rgba(60,20,50,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SHEET },
  sky: { flex: 1, minHeight: 230 },
  skyText: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  eyebrow: { ...type.body, fontWeight: '500', color: colors.text, ...textShadow },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  figure: { fontSize: 76, lineHeight: 82, fontWeight: '200', letterSpacing: -3, color: '#FFFFFF', fontVariant: ['tabular-nums'], ...textShadow },
  unit: { fontSize: 24, fontWeight: '300', color: '#FFFFFF', marginTop: 12, marginLeft: 2, ...textShadow },
  caption: { ...type.caption, fontWeight: '500', color: colors.text, ...textShadow },
  // Sized to its content, so the close button always has room below the text.
  sheet: {
    maxHeight: '62%',
    marginTop: -28,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  sheetTint: { backgroundColor: 'rgba(40,20,48,0.32)' },
  scroll: { flexGrow: 0 },
  content: { padding: spacing.lg, gap: spacing.sm },
  headline: { fontSize: 24, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  reasons: { gap: spacing.sm, marginVertical: spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reasonText: { ...type.body, fontSize: 15, color: colors.text, flex: 1 },
  section: { ...type.label, color: colors.textDim, marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...type.caption, color: colors.text, width: 92 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: '#F7A98F' },
  barValue: { ...type.caption, color: colors.text, width: 38, textAlign: 'right', fontVariant: ['tabular-nums'] },
  method: { ...type.caption, color: colors.textDim, marginTop: spacing.md },
});
