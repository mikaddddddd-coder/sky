import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The sun sits just above the panel's top edge, wherever the panel ends up.
  const [panelTop, setPanelTop] = useState(height * 0.4);

  const date =
    r &&
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      timeZone: r.city.timezone,
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date());

  return (
    <View style={styles.root}>
      <GlowSky
        horizon={Math.min(0.8, (panelTop + insets.top + 20) / height)}
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
      <SafeAreaView style={styles.fill} edges={['top']}>
        {r && g && (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false}>
            <Rise style={styles.header}>
              <Text style={styles.eyebrow}>
                {t('glowTitle')} · {r.city.name[lang]} · {date}
              </Text>
            </Rise>

            {/* Open sky above the panel, where the clouds and the setting sun are drawn. */}
            <View style={styles.skyGap} />

            {/* One panel, in layers: tonight's odds, why, the clouds behind it, then how it's worked out. */}
            <View onLayout={(e) => setPanelTop(e.nativeEvent.layout.y)}>
              <Rise delay={180}>
                <View style={styles.panel}>
                  <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['rgba(70,26,44,0.12)', 'rgba(20,12,20,0.74)']} locations={[0, 0.35]} style={StyleSheet.absoluteFill} />

                  <View style={styles.block}>
                    <Text style={styles.panelTitle}>{t('glowDetailLead', { city: r.city.name[lang] })}</Text>
                    <Text style={styles.sub}>
                      {t(`glowLevel_${g.level}`)} · {t('sunset')} {formatTime(r.sky.sun.sunset, r.city.timezone, lang)}
                    </Text>
                    <View style={styles.figureRow}>
                      <Text style={styles.hero}>{shown}</Text>
                      <Text style={styles.unit}>%</Text>
                    </View>
                  </View>

                  <View style={styles.block}>
                    <Text style={styles.section}>{t('glowDetailTitle', { pct: g.score })}</Text>
                    <View style={styles.reasons}>
                      {g.reasons.map((reason, i) => (
                        <Rise key={reason} delay={350 + i * 90} style={styles.reason}>
                          <View style={[styles.dot, { backgroundColor: POSITIVE.has(reason) ? colors.good : colors.bad }]} />
                          <Text style={styles.reasonText}>{t(`glow_reason_${reason}`)}</Text>
                        </Rise>
                      ))}
                    </View>
                  </View>

                  <View style={styles.block}>
                    <Text style={styles.section}>{t('glowCloudLayers')}</Text>
                    <View style={styles.bars}>
                      <Bar label={t('glowLayerHigh')} value={g.inputs.localHigh} delay={500} />
                      <Bar label={t('glowLayerMid')} value={g.inputs.localMid} delay={580} />
                      <Bar label={t('glowLayerLow')} value={g.inputs.localLow} delay={660} />
                      <Bar label={t('glowWestLow')} value={g.inputs.westLow} delay={740} />
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.method}>{t('glowMethod')}</Text>
                </View>
              </Rise>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const textShadow = { textShadowColor: 'rgba(60,20,50,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SHEET },
  fill: { flex: 1 },
  content: { padding: spacing.md },
  header: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  eyebrow: { ...type.body, fontWeight: '500', color: colors.text, ...textShadow },
  skyGap: { height: 220 },
  panel: {
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  block: { gap: spacing.xs },
  panelTitle: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  hero: { fontSize: 68, lineHeight: 74, fontWeight: '300', letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 24, fontWeight: '300', color: colors.textDim, marginTop: 10, marginLeft: 4 },
  section: { ...type.label, color: colors.textDim },
  reasons: { gap: spacing.sm, marginTop: spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  reasonText: { fontSize: 17, fontWeight: '500', color: colors.text, flex: 1 },
  bars: { gap: spacing.sm + 2, marginTop: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...type.caption, color: colors.textDim, width: 92 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: '#F7A98F' },
  barValue: { fontSize: 15, fontWeight: '500', color: colors.text, width: 42, textAlign: 'right', fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },
  method: { ...type.caption, color: colors.textDim },
});
