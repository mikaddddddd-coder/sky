import { useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass, type Aura } from '../../components/Glass';
import { GlowOrb } from '../../components/GlowOrb';
import { MoonDisc } from '../../components/MoonDisc';
import { Rise, useCountUp } from '../../components/Motion';
import { skyPhaseFor } from '../../components/SceneBackground';
import { SunArc } from '../../components/SunArc';
import { TonightBackdrop } from '../../components/TonightBackdrop';
import { TyphoonRadar } from '../../components/TyphoonRadar';
import { VenusMini } from '../../components/VenusMini';
import { colors, spacing } from '../../constants/theme';
import { formatTime } from '../../lib/format';
import { useTonightReport } from '../../lib/report';
import { useSettings } from '../../lib/settings';
import type { Level } from '../../lib/sky/level';
import type { CityReport } from '../../lib/sky/report';

// Only the promising levels get colour; the rest stay quiet white.
const LEVEL_COLOR: Record<Level, string> = {
  excellent: colors.good,
  good: '#FFC39A',
  fair: colors.text,
  poor: colors.text,
};

// Cards come in three sizes so the page has a lead: the sunset glow is the hero,
// sun and typhoon run full width, and moon and Venus sit side by side.
const HEIGHT = { hero: 240, wide: 176, tile: 224, strip: 136 };
const RADAR = 150;

// Each card glows in its own colour. The glow card's light follows tonight's odds,
// so a promising evening is visibly louder than a quiet one.
const GLOW_AURA: Record<Level, string> = { excellent: '#FF4F7B', good: '#FF7444', fair: '#E07752', poor: '#C2577A' };
const AURA = {
  sun: { color: '#FFA53D', x: 0.85, y: 1.05, strength: 0.22 },
  moon: { color: '#8FA8FF', x: 0.75, y: 0.3, strength: 0.2 },
  venus: { color: '#B48CFF', x: 0.3, y: 0.35, strength: 0.22 },
  // Typhoon stays blue either way; a storm in range is just a deeper, stronger blue.
  calm: { color: '#6FB4FF', x: 0.85, y: 0.5, strength: 0.2 },
  alert: { color: '#3D7BFF', x: 0.85, y: 0.5, strength: 0.32 },
} satisfies Record<string, Aura>;

// Type on this page runs in four steps: a small spaced label names each card,
// one line says what tonight is like, the numbers are large and light, and
// supporting detail is small and dim.
function Card({
  label,
  height,
  aura,
  backdrop,
  onPress,
  children,
}: {
  label: string;
  height: number;
  aura: Aura;
  backdrop?: React.ReactNode;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Glass onPress={onPress} style={{ height }} contentStyle={styles.cardContent} aura={aura} backdrop={backdrop} sheen>
      <Text style={styles.eyebrow}>{label}</Text>
      <View style={styles.cardBody}>{children}</View>
    </Glass>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/** The city and its day at a glance, set straight on the sky rather than in a card. */
function CityHeader({ r }: { r: CityReport }) {
  const { t, lang } = useSettings();
  const d = r.today;
  return (
    <View style={styles.cityHeader}>
      <Text style={styles.cityName} numberOfLines={1}>
        {r.city.name[lang]}
      </Text>
      {d && (
        <View style={styles.cityToday}>
          <Text style={styles.temp}>
            {Math.round(d.tempMin)}° <Text style={styles.tempDash}>/</Text> {Math.round(d.tempMax)}°
          </Text>
          <Text style={styles.detail}>{t('todayHumidity', { min: Math.round(d.humidityMin), max: Math.round(d.humidityMax) })}</Text>
        </View>
      )}
    </View>
  );
}

function GlowCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t } = useSettings();
  const g = r.glow;
  const pct = (v: number) => `${Math.round(v)}%`;
  const shown = useCountUp(g?.score ?? 0);
  const aura: Aura = g
    ? { color: GLOW_AURA[g.level], x: 0.8, y: 0.95, strength: 0.2 + (0.2 * g.score) / 100 }
    : { color: GLOW_AURA.poor, x: 0.8, y: 0.95, strength: 0.18 };

  return (
    <Card label={r.glowTomorrow ? `${t('glowTitle')} · ${t('tomorrow')}` : t('glowTitle')} height={HEIGHT.hero} aura={aura} backdrop={<GlowOrb score={g?.score ?? 0} />} onPress={g ? onPress : undefined}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          {g ? (
            <>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.headline, { color: LEVEL_COLOR[g.level] }]}>{t(`glowLevel_${g.level}`)}</Text>
              <View style={styles.metrics}>
                <Metric label={t('metricLowCloud')} value={pct(g.inputs.localLow)} />
                <Metric label={t('metricHighCloud')} value={`${pct(g.inputs.localMid)} / ${pct(g.inputs.localHigh)}`} />
              </View>
            </>
          ) : (
            <Text style={styles.detail}>{t('loadError')}</Text>
          )}
        </View>
        {g && (
          <View style={styles.figureBlock}>
            <View style={styles.figureRow}>
              <Text style={styles.heroFigure}>{shown}</Text>
              <Text style={styles.figureUnit}>%</Text>
            </View>
            {/* Names the number, so it does not read as cloud cover. */}
            <Text style={styles.figureCaption}>{t('glowChance')}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

function SunCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t, lang } = useSettings();
  const time = (d: Date) => formatTime(d, r.city.timezone, lang);
  return (
    <Card label={t('sunTitle')} height={HEIGHT.wide} aura={AURA.sun} onPress={onPress}>
      <SunArc sunrise={r.sky.sun.sunrise} sunset={r.sky.sun.sunset} now={new Date()} height={76} />
      <View style={styles.split}>
        <View style={styles.inlineTime}>
          <Text style={styles.metricLabel}>{t('sunrise')}</Text>
          <Text style={styles.time}>{time(r.sky.sun.sunrise)}</Text>
        </View>
        <View style={styles.inlineTime}>
          <Text style={styles.metricLabel}>{t('sunset')}</Text>
          <Text style={styles.time}>{time(r.sky.sun.sunset)}</Text>
        </View>
      </View>
    </Card>
  );
}

function MoonCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t, lang } = useSettings();
  const time = (d: Date | null) => (d ? formatTime(d, r.city.timezone, lang) : '—');
  const m = r.sky.moon;
  return (
    <Card label={t('moonTitle')} height={HEIGHT.tile} aura={AURA.moon} onPress={onPress}>
      <View style={styles.tileArt}>
        <MoonDisc size={84} illumination={m.illumination} waxing={m.waxing} />
      </View>
      <View style={styles.headBlock}>
        <Text style={styles.tileHeadline} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t(`phase_${m.phaseName}`)}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
          {t('moonrise_label')} {time(m.moonrise)}
          {'\n'}
          {t('moonset_label')} {time(m.moonset)}
        </Text>
      </View>
    </Card>
  );
}

function VenusCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t } = useSettings();
  const v = r.sky.venus;
  const c = r.sky.conjunction;
  return (
    <Card label={t('venusTitle')} height={HEIGHT.tile} aura={AURA.venus} onPress={onPress}>
      <View style={styles.tileArt}>
        <VenusMini venus={v} width={136} height={84} />
      </View>
      <View style={styles.headBlock}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.tileHeadline, { color: LEVEL_COLOR[v.level] }]}>
          {t(`venusLevel_${v.level}`)}
        </Text>
        <Text style={[styles.detail, c && { color: colors.good }]} numberOfLines={2}>
          {c ? t('conjunctionDetail', { deg: c.separation.toFixed(1) }) : t(`venus_highlight_${v.highlight}`)}
        </Text>
      </View>
    </Card>
  );
}

function TyphoonCard({ r, count, onPress }: { r: CityReport; count: number; onPress: () => void }) {
  const { t, lang } = useSettings();
  const ty = r.typhoon;
  const near = r.nearestCyclone;
  const city = r.city.name[lang];
  return (
    <Card label={t('typhoonTitle')} height={HEIGHT.strip} aura={ty ? AURA.alert : AURA.calm} onPress={onPress}>
      {/* The radar sits large in the corner, partly cut off by the card's edge. */}
      <View style={styles.radar}>
        <TyphoonRadar r={r} size={RADAR} />
      </View>
      <View style={styles.cardRow}>
        <View style={[styles.cardText, styles.radarClear]}>
          {ty ? (
            <>
              <View style={styles.figureRow}>
                <Text style={styles.compactFigure}>{Math.round(ty.km)}</Text>
                <Text style={styles.figureUnitSmall}>km</Text>
              </View>
              <Text style={styles.detail} numberOfLines={1}>
                {t('typhoonFrom', { name: ty.cyclone.name, city })}
                {ty.trend && ty.trend !== 'steady' ? ` · ${t(`typhoonTrend_${ty.trend}`)}` : ''}
              </Text>
            </>
          ) : (
            <View style={styles.headBlock}>
              <Text style={styles.headline} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t('typhoonAllClear')}</Text>
              <Text style={styles.detail} numberOfLines={2}>
                {near
                  ? t('typhoonNearestBrief', { name: near.cyclone.name, km: Math.round(near.km) })
                  : count
                    ? t('typhoonActive', { n: count })
                    : t('typhoonNoneActive')}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

/** Everything about one city's evening, as one page of the pager. */
const CityPage = memo(function CityPage({ r, count, onOpen }: { r: CityReport; count: number; onOpen: (cityId: string, path: ScenePath) => void }) {
  const open = (path: ScenePath) => onOpen(r.city.id, path);
  return (
    <View style={styles.stack}>
      <Rise>
        <CityHeader r={r} />
      </Rise>
      <Rise delay={50}>
        <GlowCard r={r} onPress={() => open('/glow')} />
      </Rise>
      <Rise delay={100}>
        <SunCard r={r} onPress={() => open('/sun')} />
      </Rise>
      <View style={styles.pair}>
        <Rise delay={150} style={styles.half}>
          <MoonCard r={r} onPress={() => open('/moon')} />
        </Rise>
        <Rise delay={200} style={styles.half}>
          <VenusCard r={r} onPress={() => open('/venus')} />
        </Rise>
      </View>
      <Rise delay={250}>
        <TyphoonCard r={r} count={count} onPress={() => open('/typhoon')} />
      </Rise>
    </View>
  );
});

type ScenePath = '/glow' | '/sun' | '/moon' | '/venus' | '/typhoon';

export default function TonightScreen() {
  const { t, lang } = useSettings();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { report, loading, error, refresh } = useTonightReport();
  const pager = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);

  const cities = report?.cities ?? [];
  const page = Math.min(index, Math.max(0, cities.length - 1));
  const selected = cities[page];
  // Horizontal pager offset, so each city's sky can fade in as its page slides in.
  const scrollX = useRef(new Animated.Value(0)).current;
  const openScene = useCallback(
    (cityId: string, path: ScenePath) => router.push({ pathname: path, params: { city: cityId } }),
    [router],
  );
  // Only the current page and its neighbours are drawn; each full page is five frosted
  // cards over its own star field, so far-off cities would cost a lot for nothing.
  const near = (i: number) => Math.abs(i - page) <= 1;
  const jump = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.fill}>
      {/* One sky per city, stacked in page order. Each fades in over the previous one as
          its page slides in, so switching cities crossfades along with the swipe. */}
      {cities.length === 0 && <TonightBackdrop phase="dusk" />}
      {cities.map(
        (r, i) =>
          near(i) && (
            <Animated.View
              key={r.city.id}
              style={[
                StyleSheet.absoluteFill,
                // The lowest sky drawn stays solid so nothing dark shows through mid-swipe.
                i > 0 && i >= page && { opacity: scrollX.interpolate({ inputRange: [(i - 1) * width, i * width], outputRange: [0, 1], extrapolate: 'clamp' }) },
              ]}
              pointerEvents="none"
            >
              <TonightBackdrop phase={skyPhaseFor(new Date(), r.sky.sun.sunset, r.sky.sun.civilDusk)} />
            </Animated.View>
          ),
      )}
      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* The city name on each page is the title; up here is just freshness and the page dots. */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.sub}>
              {report && selected ? t('updatedAt', { time: formatTime(report.generatedAt, selected.city.timezone, lang) }) : ' '}
            </Text>
            {cities.length > 1 && (
              <View style={styles.dots}>
                {cities.map((c, i) => (
                  <Pressable key={c.city.id} onPress={() => jump(i)} hitSlop={6} accessibilityLabel={c.city.name[lang]}>
                    <View style={[styles.dot, i === page && styles.dotOn]} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {!report && loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.text} />
            <Text style={styles.sub}>{t('loading')}</Text>
          </View>
        )}
        {error && !report && <Text style={[styles.sub, styles.padded]}>{t('loadError')}</Text>}

        {/* One page per followed city; swipe sideways to switch. */}
        <Animated.ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          // The page follows the swipe as it passes halfway, not just when it settles, so a
          // quick second swipe already finds the next city drawn.
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
            listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width)),
          })}
          style={styles.fill}
        >
          {cities.map((r, i) =>
            near(i) ? (
              <ScrollView
                key={r.city.id}
                style={{ width }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading && !!report} onRefresh={refresh} tintColor={colors.text} />}
              >
                <CityPage r={r} count={report?.activeCyclones.length ?? 0} onOpen={openScene} />
                <Text style={styles.footer}>{t('dataSource')}</Text>
              </ScrollView>
            ) : (
              <View key={r.city.id} style={{ width }} />
            ),
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stack: { gap: spacing.md - 4 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, gap: spacing.md - 4, paddingBottom: 110 },
  header: { gap: 2, paddingHorizontal: spacing.md, marginBottom: spacing.sm, marginTop: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotOn: { width: 16, backgroundColor: colors.text },
  padded: { paddingHorizontal: spacing.md },
  sub: { fontSize: 11, letterSpacing: 0.4, color: colors.textDim, fontVariant: ['tabular-nums'] },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  cityHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  cityName: { fontSize: 36, fontWeight: '600', letterSpacing: -0.8, color: colors.text, flexShrink: 1 },
  cityToday: { alignItems: 'flex-end', gap: 3, paddingBottom: 4 },
  temp: { fontSize: 20, fontWeight: '200', letterSpacing: -0.2, color: colors.text, fontVariant: ['tabular-nums'] },
  tempDash: { color: colors.textDim },
  // Card label: small, spaced, quiet.
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(245,243,255,0.5)' },
  // One line of verdict per card.
  headline: { fontSize: 22, fontWeight: '600', letterSpacing: -0.3, color: colors.text },
  headBlock: { gap: 4 },
  // Supporting detail.
  detail: { fontSize: 13, lineHeight: 18, color: colors.textDim, fontVariant: ['tabular-nums'] },
  cardContent: { flex: 1, gap: spacing.sm },
  cardBody: { flex: 1, justifyContent: 'space-between' },
  cardRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: spacing.lg },
  metric: { gap: 2 },
  metricLabel: { fontSize: 11, letterSpacing: 0.4, color: 'rgba(245,243,255,0.5)' },
  metricValue: { fontSize: 17, fontWeight: '400', color: colors.text, fontVariant: ['tabular-nums'] },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  figureBlock: { alignItems: 'flex-end' },
  figureCaption: { fontSize: 12, letterSpacing: 0.4, color: colors.textDim, marginTop: -6, marginRight: 4 },
  // A soft shadow keeps the thin numerals legible over the bright part of the glow.
  heroFigure: {
    fontSize: 120,
    lineHeight: 124,
    fontWeight: '100',
    letterSpacing: -5,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(90,20,8,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  pair: { flexDirection: 'row', gap: spacing.md - 4 },
  // Offsets are from the card body, which sits inside the card's 20pt padding.
  radar: { position: 'absolute', right: -30, bottom: -55 },
  radarClear: { marginRight: RADAR * 0.75 },
  half: { flex: 1 },
  // Square tiles: the picture on top, the verdict underneath.
  tileArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileHeadline: { fontSize: 19, fontWeight: '600', letterSpacing: -0.3, color: colors.text },
  figureUnit: { fontSize: 18, fontWeight: '200', color: colors.textDim, marginTop: 10, marginLeft: 2 },
  compactFigure: { fontSize: 52, lineHeight: 56, fontWeight: '100', letterSpacing: -1.5, color: colors.text, fontVariant: ['tabular-nums'] },
  figureUnitSmall: { fontSize: 13, fontWeight: '300', color: colors.textDim, marginTop: 6, marginLeft: 3 },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  inlineTime: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  time: { fontSize: 28, fontWeight: '200', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] },
  footer: { fontSize: 11, color: colors.textDim, textAlign: 'center', marginTop: spacing.md },
});
