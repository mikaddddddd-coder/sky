import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { Rise } from '../components/Motion';
import { Panel } from '../components/Panel';
import { SunArc } from '../components/SunArc';
import { useSvgId } from '../components/useSvgId';
import { colors, spacing, type } from '../constants/theme';
import { dirKey, formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import { computeSunDay, type LightWindow } from '../lib/sky/astro';
import { tzOffsetMinutes } from '../lib/sky/report';

const GOLDEN = '#FFC27A';
const BLUE = '#8FA8FF';
const NIGHT = 'rgba(245,243,255,0.4)';
const SUNSET = '#FF9A4D';

// The page is one evening sky: blue up top, burning down through orange and red
// into the dark the panel sits on.
const SKY = ['#3B78BC', '#8E8A9A', '#E98A3C', '#C4492A', '#3A150C', '#120A08', '#0C0909'] as const;
const SKY_STOPS = [0, 0.14, 0.27, 0.38, 0.52, 0.68, 1] as const;
// The evening light bar runs from golden hour through sunset into blue hour.
const EVENING = ['#2A1208', '#E8762F', '#F6B07A', '#7C8FC9', '#2E4E9A'] as const;

type Row = { key: string; color: string; title: string; desc: string; time: string };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** Warm light pooled on the horizon under the sun's arc. */
function HorizonGlow() {
  const id = useSvgId('sunglow');
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 200" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#FFB062" stopOpacity={0.75} />
          <Stop offset={0.5} stopColor="#F07A35" stopOpacity={0.3} />
          <Stop offset={1} stopColor="#F07A35" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={62} rx={46} ry={26} fill={`url(#${id})`} />
    </Svg>
  );
}

export default function SunScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const clearance = useCloseButtonClearance();
  const now = new Date();
  const day = useMemo(
    () => (r ? computeSunDay(r.city.latitude, r.city.longitude, new Date(), tzOffsetMinutes(r.city.timezone, new Date())) : null),
    [r],
  );

  const sky = <LinearGradient colors={SKY} locations={SKY_STOPS} style={StyleSheet.absoluteFill} />;
  if (!r || !day) return <View style={styles.root}>{sky}</View>;

  const time = (d: Date | null) => (d ? formatTime(d, r.city.timezone, lang) : '—');
  const range = (w: LightWindow) => (w ? `${time(w.start)} – ${time(w.end)}` : '—');
  const date = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: r.city.timezone,
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(now);

  const mins = Math.round(day.dayLength / 60_000);
  const diffS = Math.round((day.dayLength - day.dayLengthYesterday) / 1000);
  const diff = t('sunDiff', { sign: diffS < 0 ? '−' : '+', m: Math.floor(Math.abs(diffS) / 60), s: Math.abs(diffS) % 60 });
  const bearing = (key: 'sunRiseDesc' | 'sunSetDesc', az: number | null) =>
    az === null ? '' : t(key, { dir: t(dirKey(az)), deg: Math.round(az) });

  // Where now falls in the evening light, from the start of golden hour to the end of blue hour.
  const eveStart = day.eveningGolden?.start ?? day.sunset;
  const eveEnd = day.eveningBlue?.end ?? day.astronomicalDusk;
  const eveProgress = eveStart && eveEnd ? (now.getTime() - eveStart.getTime()) / (eveEnd.getTime() - eveStart.getTime()) : -1;

  const rows: Row[] = [
    { key: 'dawn', color: NIGHT, title: t('sunAstroDawn'), desc: t('sunAstroDawnDesc'), time: time(day.astronomicalDawn) },
    { key: 'blueAm', color: BLUE, title: t('sunBlueHour'), desc: t('sunBlueDesc'), time: range(day.morningBlue) },
    { key: 'goldAm', color: GOLDEN, title: t('sunGoldenHour'), desc: t('sunGoldenDesc'), time: range(day.morningGolden) },
    { key: 'rise', color: '#FFD36B', title: t('sunrise'), desc: bearing('sunRiseDesc', day.sunriseAzimuth), time: time(day.sunrise) },
    { key: 'noon', color: '#FFF1C2', title: t('sunSolarNoon'), desc: t('sunSolarNoonDesc'), time: time(day.solarNoon) },
    { key: 'goldPm', color: GOLDEN, title: t('sunGoldenHour'), desc: t('sunGoldenDesc'), time: range(day.eveningGolden) },
    { key: 'set', color: colors.glow, title: t('sunset'), desc: bearing('sunSetDesc', day.sunsetAzimuth), time: time(day.sunset) },
    { key: 'bluePm', color: BLUE, title: t('sunBlueHour'), desc: t('sunBlueDesc'), time: range(day.eveningBlue) },
    { key: 'dark', color: NIGHT, title: t('sunNightfall'), desc: t('sunNightfallDesc'), time: time(day.astronomicalDusk) },
  ];
  // Rows run in start order; highlight the one we are in now or heading into next.
  const ends = [day.astronomicalDawn, day.morningBlue?.end, day.morningGolden?.end, day.sunrise, day.solarNoon, day.eveningGolden?.end, day.sunset, day.eveningBlue?.end, day.astronomicalDusk];
  const nextIndex = ends.findIndex((e) => !!e && e.getTime() >= now.getTime());

  return (
    <View style={styles.root}>
      {sky}
      <HorizonGlow />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: clearance }]} showsVerticalScrollIndicator={false}>
          <Rise style={styles.header}>
            <Text style={styles.eyebrow}>
              {t('sunTitle')} · {r.city.name[lang]} · {date}
            </Text>
          </Rise>

          <Rise delay={80} style={styles.arc}>
            {day.sunrise && day.sunset && <SunArc sunrise={day.sunrise} sunset={day.sunset} now={now} height={170} />}
          </Rise>

          {/* Everything else reads from one panel, in layers: the sunset, the day in
              numbers, the evening light, then the whole day's light. */}
          <Rise delay={180}>
            <Panel tint={['rgba(60,20,10,0.12)', 'rgba(14,9,8,0.72)']}>

              <View style={styles.block}>
                <Text style={styles.panelTitle}>{t('sunTodaySunset')}</Text>
                {!!bearing('sunSetDesc', day.sunsetAzimuth) && <Text style={styles.sub}>{bearing('sunSetDesc', day.sunsetAzimuth)}</Text>}
                <Text style={styles.hero}>{time(day.sunset)}</Text>
              </View>

              <View style={styles.grid}>
                <Stat label={t('sunrise')} value={time(day.sunrise)} />
                <Stat label={t('sunDaylight')} value={t('sunDayLength', { h: Math.floor(mins / 60), m: mins % 60 })} />
                <Stat label={t('sunVsYesterday')} value={diff} />
                <Stat label={t('sunNoonAltitude')} value={`${Math.round(day.noonAltitude)}°`} />
              </View>

              <View style={styles.block}>
                <Text style={styles.section}>{t('sunEveningLight')}</Text>
                <View style={styles.bar}>
                  <LinearGradient colors={EVENING} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  {eveProgress >= 0 && eveProgress <= 1 && <View style={[styles.marker, { left: `${eveProgress * 100}%` }]} />}
                </View>
                <View style={styles.eveTimes}>
                  <View>
                    <Text style={styles.statLabel}>{t('sunGoldenHour')}</Text>
                    <Text style={styles.eveTime}>{time(day.eveningGolden?.start ?? null)}</Text>
                  </View>
                  <View style={styles.center}>
                    <Text style={styles.statLabel}>{t('sunset')}</Text>
                    <Text style={[styles.eveTime, { color: SUNSET }]}>{time(day.sunset)}</Text>
                  </View>
                  <View style={styles.end}>
                    <Text style={styles.statLabel}>{t('sunBlueHour')}</Text>
                    <Text style={styles.eveTime}>{time(day.eveningBlue?.end ?? null)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View>
                <Text style={[styles.section, styles.sectionGap]}>{t('sunLightTitle')}</Text>
                {rows.map((row, i) => (
                  <View key={row.key} style={[styles.row, i < nextIndex && styles.rowPast]}>
                    <View style={styles.rail}>
                      <View style={[styles.dot, { backgroundColor: row.color }, i === nextIndex && styles.dotNext]} />
                      {i < rows.length - 1 && <View style={styles.line} />}
                    </View>
                    <View style={styles.rowText}>
                      <View style={styles.rowHead}>
                        <Text style={styles.rowTitle}>{row.title}</Text>
                        <Text style={styles.rowTime}>{row.time}</Text>
                      </View>
                      {!!row.desc && <Text style={styles.sub}>{row.desc}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </Panel>
          </Rise>
        </ScrollView>
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const textShadow = { textShadowColor: 'rgba(40,15,10,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0909' },
  fill: { flex: 1 },
  content: { padding: spacing.md },
  header: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  eyebrow: { ...type.body, fontWeight: '500', color: colors.text, ...textShadow },
  arc: { marginTop: spacing.xl, marginBottom: spacing.sm },
  block: { gap: spacing.xs },
  panelTitle: { ...type.title, color: colors.text },
  hero: { fontSize: 68, lineHeight: 74, fontWeight: '300', letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'], marginTop: spacing.xs },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  stat: { width: '50%', gap: 4 },
  statLabel: { ...type.caption, color: colors.textDim },
  statValue: { fontSize: 18, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  section: { ...type.label, color: colors.textDim },
  sectionGap: { marginBottom: spacing.md },
  bar: { height: 14, borderRadius: 7, overflow: 'hidden', marginTop: spacing.sm },
  marker: { position: 'absolute', top: 1, width: 4, height: 12, marginLeft: -2, borderRadius: 2, backgroundColor: '#FFFFFF' },
  eveTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  center: { alignItems: 'center' },
  end: { alignItems: 'flex-end' },
  eveTime: { fontSize: 17, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'], marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },
  row: { flexDirection: 'row', gap: spacing.md },
  rowPast: { opacity: 0.5 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  dotNext: { width: 12, height: 12, borderRadius: 6, marginTop: 3.5, borderWidth: 2, borderColor: '#FFFFFF' },
  line: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 3 },
  rowText: { flex: 1, paddingBottom: spacing.md, gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...type.headline, color: colors.text },
  rowTime: { ...type.body, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
});
