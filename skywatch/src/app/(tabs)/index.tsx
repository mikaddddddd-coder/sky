import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import {
  ChevronRightIcon,
  CloudIcon,
  CycloneIcon,
  DropIcon,
  HighCloudIcon,
  SparkleIcon,
  UmbrellaIcon,
} from '../../components/Icons';
import { MoonDisc } from '../../components/MoonDisc';
import { Rise, useCountUp } from '../../components/Motion';
import { SceneBackground, skyPhaseFor } from '../../components/SceneBackground';
import { SunArc } from '../../components/SunArc';
import { colors, spacing, type } from '../../constants/theme';
import { formatTime } from '../../lib/format';
import { useTonightReport } from '../../lib/report';
import { useSettings } from '../../lib/settings';
import type { Level } from '../../lib/sky/level';
import type { CityReport } from '../../lib/sky/report';

const LEVEL_COLOR: Record<Level, string> = {
  excellent: colors.good,
  good: '#FFC39A',
  fair: colors.text,
  poor: colors.textDim,
};

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        {icon}
        <Text style={styles.metricValue}>{value}</Text>
      </View>
    </View>
  );
}

function HeroCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t, lang } = useSettings();
  const time = (d: Date) => formatTime(d, r.city.timezone, lang);
  const g = r.glow;
  const pct = (v: number) => `${Math.round(v)}%`;
  const shown = useCountUp(g?.score ?? 0);

  return (
    <Glass onPress={g ? onPress : undefined}>
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.city}>{r.city.name[lang]}</Text>
          <Text style={styles.sub}>
            {t('sunset')} {time(r.sky.sun.sunset)} · {t('civilDusk')} {time(r.sky.sun.civilDusk)}
          </Text>
        </View>
        <View style={[styles.orb, { opacity: g ? 0.35 + (g.score / 100) * 0.65 : 0.3 }]} />
      </View>

      {g ? (
        <View style={styles.heroBottom}>
          <View style={styles.metrics}>
            <Metric icon={<CloudIcon color={colors.text} size={15} />} label={t('metricLowCloud')} value={pct(g.inputs.localLow)} />
            <Metric
              icon={<HighCloudIcon color={colors.text} size={15} />}
              label={t('metricHighCloud')}
              value={`${Math.round(g.inputs.localMid)} / ${pct(g.inputs.localHigh)}`}
            />
            <Metric icon={<DropIcon color={colors.text} size={15} />} label={t('metricHumidity')} value={pct(g.inputs.humidity)} />
            <Metric icon={<UmbrellaIcon color={colors.text} size={15} />} label={t('metricRain')} value={pct(g.inputs.precipProbability)} />
          </View>
          <View style={styles.figureBox}>
            <View style={styles.figureRow}>
              <Text style={styles.figure}>{shown}</Text>
              <Text style={styles.figureUnit}>%</Text>
            </View>
            <Text style={[styles.levelText, { color: LEVEL_COLOR[g.level] }]}>
              {t('glowTitle')} · {t(`level_${g.level}`)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.sub}>{t('loadError')}</Text>
      )}
    </Glass>
  );
}

function SunCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t, lang } = useSettings();
  const time = (d: Date) => formatTime(d, r.city.timezone, lang);
  return (
    <Glass onPress={onPress}>
      <SunArc sunrise={r.sky.sun.sunrise} sunset={r.sky.sun.sunset} now={new Date()} />
      <View style={styles.split}>
        <View>
          <Text style={styles.sub}>{t('sunrise')}</Text>
          <Text style={styles.time}>{time(r.sky.sun.sunrise)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.sub}>{t('sunset')}</Text>
          <Text style={styles.time}>{time(r.sky.sun.sunset)}</Text>
        </View>
      </View>
    </Glass>
  );
}

function MoonCard({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t, lang } = useSettings();
  const time = (d: Date | null) => (d ? formatTime(d, r.city.timezone, lang) : '—');
  const m = r.sky.moon;
  return (
    <Glass onPress={onPress}>
      <View style={styles.moonRow}>
        <View style={styles.moonSide}>
          <Text style={styles.sub}>{t('moonrise_label')}</Text>
          <Text style={styles.time}>{time(m.moonrise)}</Text>
        </View>
        <MoonDisc size={96} illumination={m.illumination} waxing={m.waxing} />
        <View style={[styles.moonSide, { alignItems: 'flex-end' }]}>
          <Text style={styles.sub}>{t('moonset_label')}</Text>
          <Text style={styles.time}>{time(m.moonset)}</Text>
        </View>
      </View>
      <Text style={styles.center}>
        {t(`phase_${m.phaseName}`)} · {t(`moon_highlight_${m.highlight}`)}
      </Text>
    </Glass>
  );
}

function VenusRow({ r, onPress }: { r: CityReport; onPress: () => void }) {
  const { t } = useSettings();
  const v = r.sky.venus;
  return (
    <Glass onPress={onPress}>
      <View style={styles.listRow}>
        <SparkleIcon color={colors.venus} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{t('venusTitle')}</Text>
          <Text style={styles.sub}>{t(`venus_highlight_${v.highlight}`)}</Text>
        </View>
        <Text style={[styles.levelText, { color: LEVEL_COLOR[v.level] }]}>{t(`level_${v.level}`)}</Text>
        <ChevronRightIcon color={colors.textDim} size={18} />
      </View>
      {r.sky.conjunction && (
        <View style={styles.listRow}>
          <SparkleIcon color={colors.good} size={20} />
          <Text style={[styles.sub, { flex: 1 }]}>{t('conjunctionDetail', { deg: r.sky.conjunction.separation.toFixed(1) })}</Text>
        </View>
      )}
    </Glass>
  );
}

function TyphoonRow({ r, count, onPress }: { r: CityReport; count: number; onPress: () => void }) {
  const { t, lang } = useSettings();
  const ty = r.typhoon;
  return (
    <Glass onPress={onPress}>
      <View style={styles.listRow}>
        <CycloneIcon color={ty ? colors.typhoon : colors.text} size={20} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{t('typhoonTitle')}</Text>
          <Text style={styles.sub}>
            {ty
              ? t('typhoonHeadline', { name: ty.cyclone.name, city: r.city.name[lang] })
              : count
                ? t('typhoonActive', { n: count })
                : t('typhoonNone')}
          </Text>
        </View>
        {ty && (
          <View style={styles.figureRow}>
            <Text style={styles.compactFigure}>{Math.round(ty.km)}</Text>
            <Text style={styles.figureUnitSmall}>km</Text>
          </View>
        )}
        <ChevronRightIcon color={colors.textDim} size={18} />
      </View>
    </Glass>
  );
}

/** Everything about one city's evening, as one page of the pager. */
function CityPage({ r, count, onOpen }: { r: CityReport; count: number; onOpen: (path: ScenePath) => void }) {
  return (
    <View style={styles.stack}>
      <Rise>
        <HeroCard r={r} onPress={() => onOpen('/glow')} />
      </Rise>
      <Rise delay={70}>
        <SunCard r={r} onPress={() => onOpen('/sun')} />
      </Rise>
      <Rise delay={140}>
        <MoonCard r={r} onPress={() => onOpen('/moon')} />
      </Rise>
      <Rise delay={210}>
        <VenusRow r={r} onPress={() => onOpen('/venus')} />
      </Rise>
      <Rise delay={280}>
        <TyphoonRow r={r} count={count} onPress={() => onOpen('/typhoon')} />
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
  const phase = selected ? skyPhaseFor(new Date(), selected.sky.sun.sunset, selected.sky.sun.civilDusk) : 'dusk';
  const jump = (i: number) => {
    pager.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  return (
    <View style={styles.fill}>
      <SceneBackground scene={phase} />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tonightTitle')}</Text>
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
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
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
        </ScrollView>
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
  title: { ...type.largeTitle, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  city: { ...type.title, color: colors.text },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  orb: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F7B48A' },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md },
  metrics: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  metric: { width: '50%', gap: 4 },
  metricLabel: { ...type.caption, color: colors.textDim },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricValue: { ...type.body, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  figureBox: { alignItems: 'flex-end' },
  figureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  figure: { fontSize: 64, lineHeight: 68, fontWeight: '200', letterSpacing: -2, color: colors.text, fontVariant: ['tabular-nums'] },
  figureUnit: { fontSize: 20, fontWeight: '300', color: colors.text, marginTop: 8, marginLeft: 2 },
  levelText: { ...type.caption, fontWeight: '500' },
  compactFigure: { fontSize: 36, lineHeight: 40, fontWeight: '200', letterSpacing: -1, color: colors.text, fontVariant: ['tabular-nums'] },
  figureUnitSmall: { fontSize: 14, fontWeight: '300', color: colors.text, marginTop: 5, marginLeft: 2 },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 24, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  moonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moonSide: { width: 84, gap: 2 },
  center: { ...type.caption, color: colors.text, textAlign: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { ...type.headline, color: colors.text },
  footer: { ...type.caption, fontSize: 11, color: colors.textDim, textAlign: 'center', marginTop: spacing.md },
});
