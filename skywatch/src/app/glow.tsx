import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { LinearGradient } from 'expo-linear-gradient';
import { GlowSky } from '../components/GlowSky';
import { easeOut, Rise, useCountUp } from '../components/Motion';
import { Panel, PanelStat } from '../components/Panel';
import { aodLevel, vividLevel } from '../lib/sky/sunsetGlow';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

const POSITIVE = new Set(['canvas', 'clearWest', 'afterRain', 'clean']);
const SHEET = '#140C14';

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
  const [panelTop, setPanelTop] = useState(height * 0.4);
  // Where the panel's top edge sits on screen.
  const horizon = panelTop + insets.top;

  const date =
    r &&
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
      timeZone: r.city.timezone,
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(r.glowSunset);

  return (
    <View style={styles.root}>
      {/* The live sky, with the sun resting just above the panel's top edge. */}
      <GlowSky
        horizon={Math.min(0.8, (horizon + 20) / height)}
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
      {/* Below the horizon the sky sinks into night, as on the sun page, so the panel settles into the dark. */}
      <LinearGradient
        colors={['rgba(20,12,20,0)', 'rgba(20,12,20,0.85)', SHEET]}
        locations={[Math.max(0, horizon / height - 0.04), Math.min(0.98, horizon / height + 0.12), Math.min(1, horizon / height + 0.24)]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
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
                <Panel tint={['rgba(90,26,12,0.12)', 'rgba(18,10,16,0.8)']}>

                  <View style={styles.block}>
                    <Text style={styles.panelTitle}>{t(r.glowTomorrow ? 'glowDetailLeadTomorrow' : 'glowDetailLead', { city: r.city.name[lang] })}</Text>
                    <Text style={styles.sub}>
                      {t(`glowLevel_${g.level}`)} · {t('sunset')} {formatTime(r.glowSunset, r.city.timezone, lang)}
                    </Text>
                    <View style={styles.figureRow}>
                      <Text style={styles.hero}>{shown}</Text>
                      <Text style={styles.unit}>%</Text>
                    </View>
                    {/* Say plainly what the number is, and how to read it. */}
                    <Text style={styles.chance}>{t(r.glowTomorrow ? 'glowChanceTomorrow' : 'glowChanceTonight')}</Text>
                    <Text style={styles.sub}>{t('glowScale')}</Text>
                  </View>

                  {/* How vivid it would be, beside the chance of it happening. */}
                  <View style={styles.grid}>
                    <PanelStat label={t('glowVividness')} value={g.vividness == null ? '—' : `${g.vividness} · ${t(`vivid_${vividLevel(g.vividness)}`)}`} />
                    <PanelStat label={t('glowAod')} value={g.inputs.aod == null ? '—' : `${g.inputs.aod.toFixed(2)} · ${t(`aod_${aodLevel(g.inputs.aod)}`)}`} />
                    <PanelStat
                      label={t('glowEdge')}
                      value={
                        g.edgeKm == null ? '—' : g.edgeKm === 0 ? t('glowEdgeNone') : g.edgeKm >= 500 ? t('glowEdgeFar') : t('glowEdgeKm', { km: g.edgeKm })
                      }
                    />
                  </View>

                  <View style={styles.block}>
                    <Text style={styles.section}>{t('glowDetailTitle')}</Text>
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

                  <Text style={styles.method}>{t('glowVividNote')}</Text>
                  <Text style={styles.method}>{t('glowMethod')}</Text>
                </Panel>
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
  block: { gap: spacing.xs },
  panelTitle: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  chance: { fontSize: 15, fontWeight: '500', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
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
