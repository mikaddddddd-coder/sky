import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
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

// Every card on the page is the same height, so the stack reads as one rhythm.
const CARD_HEIGHT = 176;

// Type on this page runs in four steps: a small spaced label names each card,
// one line says what tonight is like, the numbers are large and light, and
// supporting detail is small and dim.
function Card({ label, onPress, children }: { label: string; onPress?: () => void; children: React.ReactNode }) {
  return (
    <Glass onPress={onPress} style={{ height: CARD_HEIGHT }} contentStyle={styles.cardContent} sheen>
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

  return (
    <Card label={t('glowTitle')} onPress={g ? onPress : undefined}>
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
          <View style={styles.figureRow}>
            <Text style={styles.figure}>{shown}</Text>
            <Text style={styles.figureUnit}>%</Text>
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
    <Card label={t('sunTitle')} onPress={onPress}>
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
    <Card label={t('moonTitle')} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          <View style={styles.headBlock}>
            <Text style={styles.headline} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{t(`phase_${m.phaseName}`)}</Text>
            <Text style={styles.detail} numberOfLines={1}>
              {t(`moon_highlight_${m.highlight}`)}
            </Text>
          </View>
          <View style={styles.metrics}>
            <Metric label={t('moonrise_label')} value={time(m.moonrise)} />
            <Metric label={t('moonset_label')} value={time(m.moonset)} />
          </View>
        </View>
        <MoonDisc size={108} illumination={m.illumination} waxing={m.waxing} />
      </View>
    </Card>
  );
}

function VenusCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t } = useSettings();
  const v = r.sky.venus;
  const c = r.sky.conjunction;
  return (
    <Card label={t('venusTitle')} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          <View style={styles.headBlock}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.headline, { color: LEVEL_COLOR[v.level] }]}>{t(`venusLevel_${v.level}`)}</Text>
            <Text style={[styles.detail, c && { color: colors.good }]} numberOfLines={2}>
              {c ? t('conjunctionDetail', { deg: c.separation.toFixed(1) }) : t(`venus_highlight_${v.highlight}`)}
            </Text>
          </View>
        </View>
        <VenusMini venus={v} width={160} height={116} />
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
    <Card label={t('typhoonTitle')} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          {ty ? (
            <>
              <View style={styles.figureRow}>
                <Text style={styles.compactFigure}>{Math.round(ty.km)}</Text>
                <Text style={styles.figureUnitSmall}>km</Text>
              </View>
              <Text style={styles.detail} numberOfLines={1}>
                {t('typhoonFrom', { name: ty.cyclone.name, city })}
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
        <TyphoonRadar r={r} size={116} />
      </View>
    </Card>
  );
}

/** Everything about one city's evening, as one page of the pager. */
function CityPage({ r, count, onOpen }: { r: CityReport; count: number; onOpen: (path: ScenePath) => void }) {
  return (
    <View style={styles.stack}>
      <Rise>
        <CityHeader r={r} />
      </Rise>
      <Rise delay={50}>
        <GlowCard r={r} onPress={() => onOpen('/glow')} />
      </Rise>
      <Rise delay={100}>
        <SunCard r={r} onPress={() => onOpen('/sun')} />
      </Rise>
      <Rise delay={150}>
        <MoonCard r={r} onPress={() => onOpen('/moon')} />
      </Rise>
      <Rise delay={200}>
        <VenusCard r={r} onPress={() => onOpen('/venus')} />
      </Rise>
      <Rise delay={250}>
        <TyphoonCard r={r} count={count} onPress={() => onOpen('/typhoon')} />
      </Rise>
    </View>
  );
}

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
  const jump = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.fill}>
      {/* One sky per city, stacked in page order. Each fades in over the previous one as
          its page slides in, so switching cities crossfades along with the swipe. */}
      {cities.length === 0 && <TonightBackdrop phase="dusk" />}
      {cities.map((r, i) => (
        <Animated.View
          key={r.city.id}
          style={[
            StyleSheet.absoluteFill,
            i > 0 && { opacity: scrollX.interpolate({ inputRange: [(i - 1) * width, i * width], outputRange: [0, 1], extrapolate: 'clamp' }) },
          ]}
          pointerEvents="none"
        >
          <TonightBackdrop phase={skyPhaseFor(new Date(), r.sky.sun.sunset, r.sky.sun.civilDusk)} />
        </Animated.View>
      ))}
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
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={styles.fill}
        >
          {cities.map((r) => (
            <ScrollView
              key={r.city.id}
              style={{ width }}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={loading && !!report} onRefresh={refresh} tintColor={colors.text} />}
            >
              <CityPage
                r={r}
                count={report?.activeCyclones.length ?? 0}
                onOpen={(path) => router.push({ pathname: path, params: { city: r.city.id } })}
              />
              <Text style={styles.footer}>{t('dataSource')}</Text>
            </ScrollView>
          ))}
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
  figure: { fontSize: 80, lineHeight: 84, fontWeight: '100', letterSpacing: -3, color: colors.text, fontVariant: ['tabular-nums'] },
  figureUnit: { fontSize: 18, fontWeight: '200', color: colors.textDim, marginTop: 10, marginLeft: 2 },
  compactFigure: { fontSize: 52, lineHeight: 56, fontWeight: '100', letterSpacing: -1.5, color: colors.text, fontVariant: ['tabular-nums'] },
  figureUnitSmall: { fontSize: 13, fontWeight: '300', color: colors.textDim, marginTop: 6, marginLeft: 3 },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  inlineTime: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  time: { fontSize: 28, fontWeight: '200', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] },
  footer: { fontSize: 11, color: colors.textDim, textAlign: 'center', marginTop: spacing.md },
});
