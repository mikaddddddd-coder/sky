import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { CloseButton } from '../components/CloseButton';
import { MoonPhaseIcon } from '../components/Icons';
import { MoonDisc } from '../components/MoonDisc';
import { Rise } from '../components/Motion';
import { Fog, NightClouds, useFade } from '../components/NightWeather';
import { StarSky } from '../components/StarSky';
import { useSvgId } from '../components/useSvgId';
import { Text } from '../components/Text';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import { computeEveningSky, moonPhaseAt, nextFullAndNew, type MoonInfo } from '../lib/sky/astro';
import { clarityAt, moonViewTime, type MoonClarity } from '../lib/sky/moonClarity';
import { tzOffsetMinutes } from '../lib/sky/report';
import { useNightWeather } from '../lib/useNightWeather';

const DAY = 24 * 3600_000;
// Finger travel per day while swiping, and how far you can go either way.
const STEP = 34;
const RANGE = 30;
const clamp = (n: number) => Math.max(-RANGE, Math.min(RANGE, n));
const CLOUD_BAND: [number, number] = [0.05, 0.6];
const FRONT_BAND: [number, number] = [0.15, 0.75];
const FRONT_THICKNESS: [number, number] = [0.16, 0.34];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {!!sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

/** The moon with whatever weather sits in front of it: a fog halo, passing cloud, and blur. */
function MoonStage({ size, illumination, waxing, clarity }: { size: number; illumination: number; waxing: boolean; clarity: MoonClarity | null }) {
  const fog = clarity?.fog ?? 0;
  const cover = clarity?.cover ?? 0;
  const moonOpacity = useFade(clarity ? 0.3 + 0.7 * (clarity.score / 100) ** 0.7 : 1);
  const haloOpacity = useFade(Math.min(0.9, fog * 1.2 + cover * 0.3));
  const id = useSvgId('moonHalo');
  const box = size * 1.9;
  const blur = Math.round(fog * 30 + (cover > 0.6 ? (cover - 0.6) * 30 : 0));

  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {/* Moonlight spreading through fog or thin cloud. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: haloOpacity }]} pointerEvents="none">
        <Svg width={box} height={box}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset={0.25} stopColor="#E9ECF7" stopOpacity={0.55} />
              <Stop offset={0.55} stopColor="#C9CEDF" stopOpacity={0.18} />
              <Stop offset={1} stopColor="#C9CEDF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ opacity: moonOpacity }}>
        <MoonDisc size={size} illumination={illumination} waxing={waxing} />
      </Animated.View>
      {blur > 2 && <BlurView intensity={blur} tint="dark" style={[styles.moonBlur, { width: size, height: size, borderRadius: size / 2 }]} />}
      <NightClouds cover={cover} width={box} height={box} seed={7} band={FRONT_BAND} strength={0.9} thickness={FRONT_THICKNESS} />
    </View>
  );
}

export default function MoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const { width, height } = useWindowDimensions();
  const weather = useNightWeather(r?.city);
  const [heroH, setHeroH] = useState(0);
  const moonSize = heroH ? Math.max(140, Math.min(250, heroH / 1.9)) : 0;

  // Days away from tonight; `settled` trails it so the heavier rise/set
  // search only runs once the finger pauses.
  const [offset, setOffset] = useState(0);
  const [settled, setSettled] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const offsetRef = useRef(0);
  const drag = useRef(new Animated.Value(0)).current;

  const go = (n: number) => {
    const next = clamp(n);
    if (next === offsetRef.current) return;
    offsetRef.current = next;
    setOffset(next);
    Haptics.selectionAsync().catch(() => {});
  };

  const pan = useMemo(() => {
    let base = 0;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        base = offsetRef.current;
        setSwiped(true);
      },
      // Swiping left moves forward in time, like turning a calendar page.
      onPanResponderMove: (_, g) => {
        drag.setValue(g.dx);
        go(base + Math.round(-g.dx / STEP));
      },
      onPanResponderRelease: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start(),
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  useEffect(() => {
    const id = setTimeout(() => setSettled(offset), 140);
    return () => clearTimeout(id);
  }, [offset]);

  const fullMoon: MoonInfo | null = useMemo(() => {
    if (!r) return null;
    if (settled === 0) return r.sky.moon;
    const day = new Date(Date.now() + settled * DAY);
    return computeEveningSky(r.city.latitude, r.city.longitude, day, tzOffsetMinutes(r.city.timezone, day)).moon;
  }, [r, settled]);

  if (!r || !fullMoon) return <StarSky />;

  // The moon as it looks an hour after sunset on the chosen evening.
  const sunsetOn = (n: number) => new Date(r.sky.sun.sunset.getTime() + n * DAY);
  const viewAt = (n: number) => new Date(sunsetOn(n).getTime() + 3600_000);
  const look = moonPhaseAt(viewAt(offset));
  const upcoming = nextFullAndNew(viewAt(offset));
  const fresh = settled === offset;
  const clarity = weather ? clarityAt(weather, moonViewTime(sunsetOn(settled), fullMoon.moonrise)) : null;

  const time = (d: Date | null) => (d ? formatTime(d, r.city.timezone, lang) : '—');
  const dateFmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, ...opts }).format(d);
  const dayLabel = dateFmt(viewAt(offset), { month: 'long', day: 'numeric', weekday: 'short' });
  const relative =
    offset === 0
      ? t('moonToday')
      : offset === 1
        ? t('moonTomorrow')
        : offset === -1
          ? t('moonYesterday')
          : offset > 0
            ? t('moonDaysLater', { n: offset })
            : t('moonDaysAgo', { n: -offset });
  const shortDate = (d: Date | null) => (d ? dateFmt(d, { month: 'short', day: 'numeric' }) : '—');

  // One line that says what tonight will actually look like.
  const why = clarity?.reasons
    .slice(0, 2)
    .map((k) => t(`clarityWhy_${k}`, { km: clarity.visibilityKm.toFixed(1) }))
    .join(t('clarityJoin'));
  const verdict =
    clarity && clarity.level === 'hidden' && why
      ? t(look.phaseName === 'full' ? 'moonHiddenFull' : 'moonHidden', { why })
      : clarity && clarity.level === 'hazy' && why
        ? t('moonDimmed', { why })
        : t(`moon_highlight_${fullMoon.highlight}`);

  const moonX = drag.interpolate({ inputRange: [-300, 300], outputRange: [-70, 70], extrapolate: 'clamp' });
  const tilt = drag.interpolate({ inputRange: [-300, 300], outputRange: ['-6deg', '6deg'], extrapolate: 'clamp' });
  const zh = lang === 'zh';

  return (
    <View style={styles.fill}>
      <StarSky drift={drag} stars={clarity ? Math.max(0.05, 1 - clarity.cover * 0.85 - clarity.fog * 0.9) : 1} />
      <NightClouds cover={clarity?.cover ?? 0} width={width} height={height} seed={3} band={CLOUD_BAND} />
      <Fog fog={(clarity?.fog ?? 0) * 0.9} />

      <SafeAreaView style={styles.fill}>
        <Rise style={styles.header}>
          <Text style={styles.eyebrow}>
            {r.city.name[lang]} · {dayLabel}
          </Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{relative}</Text>
          </View>
        </Rise>

        <View style={styles.hero} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)} {...pan.panHandlers}>
          {/* The moon rises slowly into place, then follows the finger while swiping. */}
          {moonSize > 0 && (
            <Rise distance={60} duration={1400} delay={100}>
              <Animated.View style={{ transform: [{ translateX: moonX }, { rotate: tilt }] }}>
                <MoonStage size={moonSize} illumination={look.illumination} waxing={look.waxing} clarity={clarity} />
              </Animated.View>
            </Rise>
          )}
        </View>

        <Rise delay={600} style={styles.titleBlock}>
          <Text style={[styles.phase, zh && styles.phaseZh]}>{t(`phase_${look.phaseName}`)}</Text>
          <Text style={[styles.verdict, !fresh && styles.stale]}>{verdict}</Text>
        </Rise>

        <Rise delay={750} style={[styles.stats, !fresh && styles.stale]}>
          <Stat label={t('moonrise_label')} value={time(fullMoon.moonrise)} />
          <Stat label={t('moonset_label')} value={time(fullMoon.moonset)} />
          <Stat label={t('moonLit')} value={`${Math.round(look.illumination * 100)}%`} />
          <Stat
            label={t('moonClarity')}
            value={clarity ? t(`clarity_${clarity.level}`) : '—'}
            sub={clarity ? `${clarity.score}` : undefined}
          />
        </Rise>
        <Text style={styles.footnote}>
          {clarity ? t('moonViewAround', { time: time(clarity.at) }) : weather ? t('moonNoForecast') : ' '}
        </Text>

        <Rise delay={900} style={styles.strip}>
          {[-3, -2, -1, 0, 1, 2, 3].map((d) => {
            const n = offset + d;
            const p = moonPhaseAt(viewAt(n));
            const on = d === 0;
            return (
              <Pressable key={d} onPress={() => go(n)} style={[styles.day, on && styles.dayOn]} hitSlop={4}>
                <MoonPhaseIcon size={on ? 20 : 16} color={on ? colors.text : colors.textDim} illumination={p.illumination} waxing={p.waxing} />
                <Text style={[styles.dayNum, on && styles.dayNumOn]}>{dateFmt(viewAt(n), { day: 'numeric' })}</Text>
              </Pressable>
            );
          })}
        </Rise>

        <View style={styles.under}>
          {offset !== 0 ? (
            <Pressable onPress={() => go(0)} style={styles.today} accessibilityRole="button">
              <Text style={styles.todayText}>{t('moonBackToday')}</Text>
            </Pressable>
          ) : (
            <Text style={styles.footnote}>
              {swiped
                ? `${t('moonNextFull', { date: shortDate(upcoming.full) })}  ·  ${t('moonNextNew', { date: shortDate(upcoming.new) })}`
                : `‹  ${t('moonSwipeHint')}  ›`}
            </Text>
          )}
        </View>
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  eyebrow: { fontSize: 15, fontWeight: '500', letterSpacing: 0.3, color: 'rgba(255,255,255,0.62)' },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(243,214,107,0.6)' },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.moonTime },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { alignItems: 'center', paddingHorizontal: spacing.xl, gap: 10 },
  phase: { fontSize: 40, lineHeight: 46, fontWeight: '300', letterSpacing: 0.5, color: '#FFFFFF' },
  phaseZh: { letterSpacing: 8, marginLeft: 8 },
  verdict: { fontSize: 15, lineHeight: 24, color: 'rgba(255,255,255,0.78)', textAlign: 'center' },
  stale: { opacity: 0.45 },
  stats: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  statLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)' },
  statValue: { fontSize: 22, fontWeight: '300', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  statSub: { ...type.caption, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontVariant: ['tabular-nums'], marginTop: -4 },
  footnote: { ...type.caption, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: spacing.sm },
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  day: { width: 40, alignItems: 'center', gap: 5, paddingVertical: 7, borderRadius: 14 },
  dayOn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  dayNum: { ...type.caption, fontSize: 11, color: colors.textDim, fontVariant: ['tabular-nums'] },
  dayNumOn: { color: colors.text, fontWeight: '600' },
  under: { height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 92 },
  today: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  todayText: { ...type.caption, fontWeight: '600', color: colors.text },
  moonBlur: { position: 'absolute' },
});
