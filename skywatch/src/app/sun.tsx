import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { Glass } from '../components/Glass';
import { Rise } from '../components/Motion';
import { SceneBackground, skyPhaseFor } from '../components/SceneBackground';
import { SunArc } from '../components/SunArc';
import { colors, spacing, type } from '../constants/theme';
import { dirKey, formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import { computeSunDay, type LightWindow } from '../lib/sky/astro';
import { tzOffsetMinutes } from '../lib/sky/report';

const GOLDEN = '#FFC27A';
const BLUE = '#8FA8FF';
const NIGHT = 'rgba(245,243,255,0.4)';

type Row = { key: string; color: string; title: string; desc: string; time: string };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function SunScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const now = new Date();
  const day = useMemo(
    () => (r ? computeSunDay(r.city.latitude, r.city.longitude, new Date(), tzOffsetMinutes(r.city.timezone, new Date())) : null),
    [r],
  );
  if (!r || !day) return <SceneBackground scene="golden" fadeIn />;

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
    <View style={styles.fill}>
      <SceneBackground scene={skyPhaseFor(now, r.sky.sun.sunset, r.sky.sun.civilDusk)} fadeIn />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Rise style={styles.header}>
            <Text style={styles.title}>{t('sunTitle')}</Text>
            <Text style={styles.titleDim}>
              {r.city.name[lang]} · {date}
            </Text>
          </Rise>

          <Rise delay={120}>
            <Glass>
              {day.sunrise && day.sunset && <SunArc sunrise={day.sunrise} sunset={day.sunset} now={now} height={150} />}
              <View style={styles.split}>
                <View>
                  <Text style={styles.sub}>{t('sunrise')}</Text>
                  <Text style={styles.time}>{time(day.sunrise)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.sub}>{t('sunset')}</Text>
                  <Text style={styles.time}>{time(day.sunset)}</Text>
                </View>
              </View>
            </Glass>
          </Rise>

          <Rise delay={220}>
            <Glass>
              <View style={styles.stats}>
                <Stat label={t('sunDaylight')} value={t('sunDayLength', { h: Math.floor(mins / 60), m: mins % 60 })} />
                <Stat label={t('sunVsYesterday')} value={diff} />
                <Stat label={t('sunNoonAltitude')} value={`${Math.round(day.noonAltitude)}°`} />
              </View>
            </Glass>
          </Rise>

          <Rise delay={320}>
            <Glass>
              <Text style={styles.section}>{t('sunLightTitle')}</Text>
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
            </Glass>
          </Rise>
        </ScrollView>
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md - 4, paddingBottom: 120 },
  header: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.xs },
  title: { ...type.largeTitle, color: colors.text },
  titleDim: { ...type.title, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  time: { fontSize: 28, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { gap: 4 },
  statLabel: { ...type.caption, color: colors.textDim },
  statValue: { fontSize: 17, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  section: { ...type.label, color: colors.textDim, marginBottom: spacing.xs },
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
