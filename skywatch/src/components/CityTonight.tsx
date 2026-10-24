import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useSettings } from '../lib/settings';
import type { Level } from '../lib/sky/level';
import type { CityReport } from '../lib/sky/report';
import { Badge, Card } from './Card';

// Phase angle: 0 new → 180 full → 360 new; eight emoji cover 45° each.
const MOON_EMOJI = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
const moonEmoji = (phaseAngle: number) => MOON_EMOJI[Math.round(phaseAngle / 45) % 8];

const LEVEL_COLOR: Record<Level, string> = {
  excellent: colors.good,
  good: colors.glow,
  fair: colors.warn,
  poor: colors.textDim,
};

function Row({ icon, title, level, children }: { icon: string; title: string; level?: Level; children: React.ReactNode }) {
  const { t } = useSettings();
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
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
        <Text style={styles.dim}>
          {t('sunset')} {time(sky.sun.sunset)} · {t('civilDusk')} {time(sky.sun.civilDusk)}
        </Text>
      </View>

      <Row icon="🔥" title={t('glowTitle')} level={glow?.level}>
        {glow ? (
          <>
            <Text style={styles.big}>
              {glow.score}
              <Text style={styles.unit}>%</Text>
            </Text>
            <Text style={styles.dim}>{glow.reasons.map((r) => t(`glow_reason_${r}`)).join(' · ')}</Text>
            <Text style={styles.small}>
              {t('clouds')}: {Math.round(glow.inputs.localLow)}/{Math.round(glow.inputs.localMid)}/
              {Math.round(glow.inputs.localHigh)}%
            </Text>
          </>
        ) : (
          <Text style={styles.dim}>{t('loadError')}</Text>
        )}
      </Row>

      <Row icon={moonEmoji(sky.moon.phaseAngle)} title={t('moonTitle')} level={sky.moon.level}>
        <Text style={styles.text}>{t(`moon_highlight_${sky.moon.highlight}`)}</Text>
        <Text style={styles.small}>
          {t('moonPhase', { pct: Math.round(sky.moon.illumination * 100) })}
          {sky.moon.moonrise ? ` · ${t('moonrise', { time: time(sky.moon.moonrise) })}` : ''}
          {' · '}
          {t('moonAltitude', { deg: Math.round(sky.moon.altitudeAfterSunset) })}
        </Text>
      </Row>

      <Row icon="✨" title={t('venusTitle')} level={sky.venus.level}>
        <Text style={styles.text}>{t(`venus_highlight_${sky.venus.highlight}`)}</Text>
        <Text style={styles.small}>
          {t('venusDetail', { alt: Math.round(sky.venus.altitudeAtDusk), mag: sky.venus.magnitude.toFixed(1) })}
        </Text>
      </Row>

      {sky.conjunction && (
        <Row icon="💫" title={t('conjunctionTitle')} level="excellent">
          <Text style={styles.text}>{t('conjunctionDetail', { deg: sky.conjunction.separation.toFixed(1) })}</Text>
        </Row>
      )}

      {typhoon && (
        <Row icon="🌀" title={t('typhoonTitle')}>
          <Text style={[styles.text, { color: colors.typhoon }]}>
            {t('typhoonNear', { name: typhoon.cyclone.name, km: Math.round(typhoon.km) })}
          </Text>
        </Row>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: spacing.xs },
  city: { color: colors.text, fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  icon: { fontSize: 22, width: 30 },
  rowBody: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  big: { color: colors.text, fontSize: 36, fontWeight: '200' },
  unit: { fontSize: 18 },
  text: { color: colors.text, fontSize: 14 },
  dim: { color: colors.textDim, fontSize: 13 },
  small: { color: colors.textDim, fontSize: 12 },
});
