import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { MoonPhaseIcon } from '../components/Icons';
import { MoonDial } from '../components/MoonDial';
import { MoonDisc } from '../components/MoonDisc';
import { Rise } from '../components/Motion';
import { StarSky } from '../components/StarSky';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';
import { computeEveningSky, moonPhaseAt, nextFullAndNew, type MoonInfo } from '../lib/sky/astro';
import { tzOffsetMinutes } from '../lib/sky/report';

const DAY = 24 * 3600_000;
// Finger travel per day while swiping, and how far you can go either way.
const STEP = 34;
const RANGE = 30;
const clamp = (n: number) => Math.max(-RANGE, Math.min(RANGE, n));

export default function MoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  // Size the moon to the space left after the text, so short screens never overlap.
  const [heroH, setHeroH] = useState(0);
  const moonSize = heroH ? Math.max(120, Math.min(220, heroH - 200)) : 0;

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
  const viewAt = (n: number) => new Date(r.sky.sun.sunset.getTime() + 3600_000 + n * DAY);
  const look = moonPhaseAt(viewAt(offset));
  const upcoming = nextFullAndNew(viewAt(offset));
  const fresh = settled === offset;

  const time = (d: Date) => formatTime(d, r.city.timezone, lang);
  const dateFmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, ...opts }).format(d);
  const dayLabel = dateFmt(viewAt(offset), { month: 'short', day: 'numeric', weekday: 'short' });
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

  const moonX = drag.interpolate({ inputRange: [-300, 300], outputRange: [-70, 70], extrapolate: 'clamp' });
  const tilt = drag.interpolate({ inputRange: [-300, 300], outputRange: ['-6deg', '6deg'], extrapolate: 'clamp' });

  return (
    <View style={styles.fill}>
      <StarSky drift={drag} />
      <SafeAreaView style={styles.fill}>
        <Rise style={styles.header}>
          <Text style={styles.title}>{t('moonTitle')}</Text>
          <Text style={styles.titleDim}>
            {r.city.name[lang]} · {dayLabel}
          </Text>
        </Rise>

        <View style={styles.hero} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)} {...pan.panHandlers}>
          {/* The moon rises slowly into place, then follows the finger while swiping. */}
          {moonSize > 0 && (
            <Rise distance={60} duration={1400} delay={100}>
              <Animated.View style={{ transform: [{ translateX: moonX }, { rotate: tilt }] }}>
                <MoonDisc size={moonSize} illumination={look.illumination} waxing={look.waxing} />
              </Animated.View>
            </Rise>
          )}
          <Rise delay={700} style={styles.heroText}>
            <Text style={styles.phase}>{t(`phase_${look.phaseName}`)}</Text>
            <Text style={styles.relative}>{relative}</Text>
          </Rise>
          <Rise delay={850} style={[styles.heroText, !fresh && styles.stale]}>
            <Text style={styles.note}>
              {t('moonIllumination', { pct: Math.round(look.illumination * 100) })}
              {fullMoon.moonrise ? ` · ${t('moonrise_label')} ${time(fullMoon.moonrise)}` : ''}
            </Text>
            <Text style={styles.highlight}>{t(`moon_highlight_${fullMoon.highlight}`)}</Text>
            <Text style={styles.note}>
              {t('moonNextFull', { date: shortDate(upcoming.full) })} · {t('moonNextNew', { date: shortDate(upcoming.new) })}
            </Text>
          </Rise>
        </View>

        <Rise delay={1000} style={styles.strip}>
          {[-3, -2, -1, 0, 1, 2, 3].map((d) => {
            const n = offset + d;
            const p = moonPhaseAt(viewAt(n));
            const on = d === 0;
            return (
              <Pressable key={d} onPress={() => go(n)} style={[styles.day, on && styles.dayOn]} hitSlop={4}>
                <MoonPhaseIcon size={on ? 22 : 18} color={on ? colors.text : colors.textDim} illumination={p.illumination} waxing={p.waxing} />
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
            !swiped && <Text style={styles.hint}>‹ {t('moonSwipeHint')} ›</Text>
          )}
        </View>

        {fullMoon.moonrise && fullMoon.moonset && (
          <View style={[styles.dial, !fresh && styles.stale]}>
            <MoonDial rise={fullMoon.moonrise} set={fullMoon.moonset} now={new Date()} label={time} />
          </View>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { ...type.largeTitle, color: colors.text },
  titleDim: { ...type.title, fontWeight: '500', color: 'rgba(255,255,255,0.45)' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  heroText: { alignItems: 'center', gap: spacing.xs },
  stale: { opacity: 0.45 },
  phase: { fontSize: 30, fontWeight: '600', letterSpacing: -0.4, color: colors.text, marginTop: spacing.sm },
  relative: { ...type.headline, fontWeight: '500', color: colors.moonTime },
  note: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  highlight: { ...type.body, color: colors.text, paddingHorizontal: spacing.lg, textAlign: 'center' },
  strip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  day: { width: 40, alignItems: 'center', gap: 4, paddingVertical: 6, borderRadius: 14 },
  dayOn: { backgroundColor: 'rgba(255,255,255,0.1)' },
  dayNum: { ...type.caption, fontSize: 11, color: colors.textDim, fontVariant: ['tabular-nums'] },
  dayNumOn: { color: colors.text, fontWeight: '600' },
  under: { height: 34, alignItems: 'center', justifyContent: 'center' },
  hint: { ...type.caption, color: 'rgba(255,255,255,0.45)' },
  today: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  todayText: { ...type.caption, fontWeight: '600', color: colors.text },
  dial: { paddingHorizontal: spacing.md, marginBottom: 84 },
});
