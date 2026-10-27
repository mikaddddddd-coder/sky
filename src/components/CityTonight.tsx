import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useSettings } from '../lib/settings';
import type { Level } from '../lib/sky/level';
import type { CityReport } from '../lib/sky/report';
import { Badge, Card } from './Card';
import { CycloneIcon, MoonPhaseIcon, SparkleIcon, SunsetIcon } from './Icons';

const LEVEL_COLOR: Record<Level, string> = {
  excellent: colors.good,
  good: colors.glow,
  fair: colors.warn,
  poor: colors.textDim,
};

function Row({ icon, title, level, children }: { icon: ReactNode; title: string; level?: Level; children: ReactNode }) {
  const { t } = useSettings();
  return (
    <View style={styles.row}>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle}>{title}</Text>
          {level && <Badge label={t(`level_${level}`)} color={LEVEL_COLOR[level]} />}
        </View>
        {children}
      </View>
    </View>
  );
}

export function CityTonight({ report }: { report: CityReport }) {
  const { t, lang } = useSettings();
  const { city, sky, glow, typhoon } = report;
  const time = (d: Date) => formatTime(d, city.timezone, lang);

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.city}>{city.name[lang]}</Text>
        <Text style={styles.caption}>
          {t('sunset')} {time(sky.sun.sunset)} · {t('civilDusk')} {time(sky.sun.civilDusk)}
        </Text>
      </View>

      <Row icon={<SunsetIcon color={colors.glow} />} title={t('glowTitle')} level={glow?.level}>
        {glow ? (
          <>
            <Text style={styles.figure}>
              {glow.score}
              <Text style={styles.unit}> %</Text>
            </Text>
            <Text style={styles.body}>{glow.reasons.map((r) => t(`glow_reason_${r}`)).join(' · ')}</Text>
            <Text style={styles.caption}>
              {t('clouds')}  {Math.round(glow.inputs.localLow)} / {Math.round(glow.inputs.localMid)} /{' '}
              {Math.round(glow.inputs.localHigh)} %
            </Text>
          </>
        ) : (
          <Text style={styles.caption}>{t('loadError')}</Text>
        )}
      </Row>

      <Row
        icon={<MoonPhaseIcon color={colors.moon} illumination={sky.moon.illumination} waxing={sky.moon.waxing} />}
        title={t('moonTitle')}
        level={sky.moon.level}
      >
        <Text style={styles.body}>{t(`moon_highlight_${sky.moon.highlight}`)}</Text>
        <Text style={styles.caption}>
          {t('moonPhase', { pct: Math.round(sky.moon.illumination * 100) })}
          {sky.moon.moonrise ? ` · ${t('moonrise', { time: time(sky.moon.moonrise) })}` : ''}
          {' · '}
          {t('moonAltitude', { deg: Math.round(sky.moon.altitudeAfterSunset) })}
        </Text>
      </Row>

      <Row icon={<SparkleIcon color={colors.venus} />} title={t('venusTitle')} level={sky.venus.level}>
        <Text style={styles.body}>{t(`venus_highlight_${sky.venus.highlight}`)}</Text>
        <Text style={styles.caption}>
          {t('venusDetail', { alt: Math.round(sky.venus.altitudeAtDusk), mag: sky.venus.magnitude.toFixed(1) })}
        </Text>
      </Row>

      {sky.conjunction && (
        <Row icon={<SparkleIcon color={colors.good} />} title={t('conjunctionTitle')} level="excellent">
          <Text style={styles.body}>{t('conjunctionDetail', { deg: sky.conjunction.separation.toFixed(1) })}</Text>
        </Row>
      )}

      {typhoon && (
        <Row icon={<CycloneIcon color={colors.typhoon} />} title={t('typhoonTitle')}>
          <Text style={[styles.body, { color: colors.typhoon }]}>
            {t('typhoonNear', { name: typhoon.cyclone.name, km: Math.round(typhoon.km) })}
          </Text>
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.xs },
  city: { ...type.title, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  icon: { width: 24, paddingTop: 1 },
  rowBody: { flex: 1, gap: 3 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { ...type.headline, color: colors.text },
  figure: { ...type.figure, color: colors.text },
  unit: { fontSize: 16, fontWeight: '300', letterSpacing: 0 },
  body: { ...type.body, color: colors.text },
  caption: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
});
