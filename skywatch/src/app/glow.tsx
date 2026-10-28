import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { LockIcon } from '../components/Icons';
import { GlowSky } from '../components/GlowSky';
import { easeOut, Rise, useCountUp } from '../components/Motion';
import { Panel, PanelStat } from '../components/Panel';
import { aodLevel, vividLevel, type GlowReason } from '../lib/sky/sunsetGlow';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import type { CityReport, GlowDay, GlowKind } from '../lib/sky/report';

const POSITIVE = new Set(['canvas', 'clearWest', 'afterRain', 'clean']);
const SHEET = '#140C14';
// The first two days of the outlook are free; the rest are for members.
const FREE_DAYS = 2;
const BAR_MAX = 52;

/**
 * The week at a glance: which day is worth it, and a bar per day to tap through.
 * Free users see the first two days; the rest sits under frosted glass with the way in on top,
 * and the headline only promises a 火烧云 when one is really forecast behind it.
 */
function WeekOutlook({ r, kind, selected, member, onSelect }: { r: CityReport; kind: GlowKind; selected: number; member: boolean; onSelect: (i: number) => void }) {
  const { t, lang } = useSettings();
  const router = useRouter();
  const days = r.week;
  const glowOf = (d: GlowDay) => (kind === 'dawn' ? d.dawn : d.dusk);
  const weekday = (d: Date) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, weekday: 'short' }).format(d);
  const label = (i: number) => (i === 0 ? t('dayToday') : i === 1 ? t('dayTomorrow') : weekday(kind === 'dawn' ? days[i].sunrise : days[i].sunset));
  const first = kind === 'dawn' ? r.dawnIndex : r.duskIndex;
  const ahead = days.map((d, i) => ({ g: glowOf(d), i })).filter(({ g, i }) => g && i >= first);
  const best = ahead.reduce((a, b) => ((b.g?.score ?? 0) > (a.g?.score ?? 0) ? b : a), ahead[0]);
  const fireLocked = days.some((d, i) => i >= FREE_DAYS && glowOf(d)?.fire);
  const headline = member
    ? best?.g?.fire
      ? t('weekBestFire', { day: label(best.i) })
      : t('weekBest', { day: `${label(best.i)} · ${best?.g?.score ?? 0}%` })
    : t(fireLocked ? 'weekTeaserFire' : 'weekTeaser');

  return (
    <View style={styles.weekBlock}>
      <Text style={[styles.weekHeadline, !member && fireLocked && { color: '#FF8A6B' }]}>{headline}</Text>
      <View style={styles.week}>
        {days.map((d, i) => {
          const g = glowOf(d);
          const h = Math.max(4, ((g?.score ?? 0) / 100) * BAR_MAX);
          const color = g?.fire ? '#FF5A3D' : g && g.score >= 50 ? '#FFB38A' : 'rgba(255,255,255,0.5)';
          return (
            <Pressable key={i} style={[styles.weekDay, i === selected && styles.weekDayOn]} onPress={() => onSelect(i)} disabled={!member && i >= FREE_DAYS}>
              <Text style={styles.weekScore}>{g ? g.score : '—'}</Text>
              <View style={styles.weekTrack}>
                <View style={[styles.weekBar, { height: h, backgroundColor: color }]} />
              </View>
              <Text style={[styles.weekLabel, member && i === best?.i && styles.weekLabelBest]}>{label(i)}</Text>
            </Pressable>
          );
        })}
        {!member && (
          <Pressable style={[styles.weekLock, { left: `${(FREE_DAYS / days.length) * 100}%` }]} onPress={() => router.push('/member')}>
            <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.weekLockPill}>
              <LockIcon color="#1A0E10" size={14} />
              <Text style={styles.weekLockText}>{t('weekUnlock')}</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

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
  const { city, kind: kindParam } = useLocalSearchParams<{ city?: string; kind?: string }>();
  const kind: GlowKind = kindParam === 'dawn' ? 'dawn' : 'dusk';
  const r = useCityReport(city);
  const { t, lang, settings } = useSettings();
  const router = useRouter();
  const member = settings.member;
  const [picked, setPicked] = useState<number | null>(null);
  const index = picked ?? (r ? (kind === 'dawn' ? r.dawnIndex : r.duskIndex) : 0);
  const day = r?.week?.[index];
  const g = day ? (kind === 'dawn' ? day.dawn : day.dusk) : r?.glow;
  const at = day ? (kind === 'dawn' ? day.sunrise : day.sunset) : r?.glowSunset;
  const shown = useCountUp(g?.score ?? 0, 1000, 300);
  const kindName = t(kind === 'dawn' ? 'dawnTitle' : 'glowTitle');
  const dayWord =
    index === 0
      ? t(kind === 'dawn' ? 'dayThisMorning' : 'dayTonight')
      : index === 1
        ? t(kind === 'dawn' ? 'dayTomorrowMorning' : 'dayTomorrowEvening')
        : null;
  // Which side of the sky a reason talks about flips in the morning.
  const reasonKey = (reason: GlowReason) =>
    kind === 'dawn' && (reason === 'lowBlock' || reason === 'clearWest') ? (`dawnReason_${reason}` as const) : (`glow_reason_${reason}` as const);
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
    }).format(at ?? r.glowSunset);

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
                {g.fire ? `🔥 ${t('fireTitle')}` : kindName} · {r.city.name[lang]} · {date}
              </Text>
            </Rise>

            {/* Open sky above the panel, where the clouds and the setting sun are drawn. */}
            <View style={styles.skyGap} />

            {/* One panel, in layers: tonight's odds, why, the clouds behind it, then how it's worked out. */}
            <View onLayout={(e) => setPanelTop(e.nativeEvent.layout.y)}>
              <Rise delay={180}>
                <Panel tint={['rgba(90,26,12,0.12)', 'rgba(18,10,16,0.8)']}>

                  <View style={styles.block}>
                    <Text style={styles.panelTitle}>{t('detailLead', { city: r.city.name[lang], day: dayWord ?? date ?? '', kind: kindName })}</Text>
                    <Text style={styles.sub}>
                      {g.fire ? t('fireHeadline') : t(kind === 'dawn' ? `dawnLevel_${g.level}` : `glowLevel_${g.level}`)} · {t(kind === 'dawn' ? 'sunriseAt' : 'sunset')}{' '}
                      {formatTime(at ?? r.glowSunset, r.city.timezone, lang)}
                    </Text>
                    <View style={styles.figureRow}>
                      <Text style={styles.hero}>{shown}</Text>
                      <Text style={styles.unit}>%</Text>
                    </View>
                    {/* Say plainly what the number is, and how to read it. */}
                    <Text style={styles.chance}>{t(kind === 'dawn' ? 'chanceDawn' : 'chanceDusk')}</Text>
                    <Text style={styles.sub}>{t('glowScale')}</Text>
                  </View>

                  {r.week && (
                    <View style={styles.block}>
                      <Text style={styles.section}>{t('weekTitle')}</Text>
                      <WeekOutlook r={r} kind={kind} selected={index} member={member} onSelect={setPicked} />
                    </View>
                  )}

                  {/* A 火烧云 gets its own call-out: what to expect and when to be outside. */}
                  {g.fire && (
                    <View style={styles.fire}>
                      <Text style={styles.fireTitle}>🔥 {t('fireTitle')}</Text>
                      <Text style={styles.fireNote}>{t(kind === 'dawn' ? 'fireNoteDawn' : 'fireNote')}</Text>
                    </View>
                  )}

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
                          <Text style={styles.reasonText}>{t(reasonKey(reason))}</Text>
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
                      <Bar label={t(kind === 'dawn' ? 'dawnEastLow' : 'glowWestLow')} value={g.inputs.westLow} delay={740} />
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
  fire: { gap: spacing.xs, padding: spacing.md, borderRadius: 18, backgroundColor: 'rgba(255,58,46,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,138,107,0.5)' },
  fireTitle: { fontSize: 17, fontWeight: '600', color: '#FF8A6B' },
  fireNote: { ...type.caption, color: colors.text },
  weekBlock: { gap: spacing.sm, marginTop: spacing.xs },
  weekHeadline: { fontSize: 17, fontWeight: '600', color: colors.text },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 14 },
  weekDayOn: { backgroundColor: 'rgba(255,255,255,0.12)' },
  weekScore: { fontSize: 13, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  weekTrack: { height: BAR_MAX, justifyContent: 'flex-end' },
  weekBar: { width: 10, borderRadius: 5 },
  weekLabel: { fontSize: 11, color: colors.textDim },
  weekLabelBest: { color: colors.text, fontWeight: '600' },
  weekLock: { position: 'absolute', right: 0, top: 0, bottom: 0, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  weekLockPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(255,138,91,0.92)' },
  weekLockText: { fontSize: 13, fontWeight: '700', color: '#1A0E10' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },
  method: { ...type.caption, color: colors.textDim },
});
