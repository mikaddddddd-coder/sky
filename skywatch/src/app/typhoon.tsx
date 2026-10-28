import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { Rise, useCountUp } from '../components/Motion';
import { Panel, PanelStat, panelText } from '../components/Panel';
import { SceneBackground } from '../components/SceneBackground';
import { TyphoonRadar } from '../components/TyphoonRadar';
import { spacing } from '../constants/theme';
import { dirKey, formatTime } from '../lib/format';
import { bearingDeg } from '../lib/geo';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

export default function TyphoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  const { width } = useWindowDimensions();
  const clearance = useCloseButtonClearance();
  // A cyclone inside the alert radius is the story; otherwise show the calm state
  // and, if there is one, the nearest cyclone further out.
  const near = r?.typhoon ?? null;
  const shown = near ?? r?.nearestCyclone ?? null;
  const km = useCountUp(shown ? Math.round(shown.km) : 0, 1100, 450);

  if (!r) return <SceneBackground scene="typhoon" fadeIn />;

  const cityName = r.city.name[lang];
  const c = shown?.cyclone;
  const level = c?.alertLevel;
  const levelLabel = level === 'green' || level === 'orange' || level === 'red' ? t(`alert_${level}`) : (level ?? '—');
  const date = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, month: 'short', day: 'numeric', weekday: 'short' }).format(
    new Date(),
  );
  const updated = c?.updatedAt
    ? new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: r.city.timezone, month: 'short', day: 'numeric' }).format(c.updatedAt) +
      ' ' +
      formatTime(c.updatedAt, r.city.timezone, lang)
    : '—';

  return (
    <View style={styles.root}>
      <SceneBackground scene="typhoon" fadeIn />
      <SafeAreaView edges={['top']} style={styles.top}>
        <Rise delay={100}>
          <Text style={panelText.eyebrow}>
            {t('typhoonTitle')} · {cityName} · {date}
          </Text>
        </Rise>
      </SafeAreaView>

      {/* The radar fills the sky: the city in the middle, the storm where it really is. */}
      <View style={styles.radar}>
        <Rise delay={150}>
          <TyphoonRadar r={r} size={Math.min(width - spacing.xl * 2, 300)} />
        </Rise>
      </View>

      <Rise delay={250} style={[styles.panelWrap, { marginBottom: clearance - spacing.md }]}>
        <Panel tint={['rgba(20,50,110,0.14)', 'rgba(8,16,36,0.8)']} style={styles.panel}>
          <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
            <View style={panelText.block}>
              <Text style={panelText.title}>{near ? t('typhoonHeadline', { name: near.cyclone.name, city: cityName }) : t('typhoonCalmTitle')}</Text>
              <Text style={panelText.sub}>{near ? t('typhoonAlert', { level: levelLabel }) : t('typhoonCalmBody', { city: cityName })}</Text>
              {shown ? (
                <>
                  <View style={panelText.figureRow}>
                    <Text style={panelText.hero}>{km}</Text>
                    <Text style={panelText.unit}>km</Text>
                  </View>
                  <Text style={panelText.sub}>
                    {near ? t('typhoonDistance') : t('typhoonNearestFar', { name: shown.cyclone.name, km: Math.round(shown.km) })}
                  </Text>
                </>
              ) : (
                <Text style={panelText.sub}>{t('typhoonNoneActive')}</Text>
              )}
            </View>

            {shown && c && (
              <View style={panelText.grid}>
                <PanelStat label={t('typhoonTrendLabel')} value={shown.trend ? t(`typhoonTrend_${shown.trend}`) : '—'} />
                <PanelStat label={t('typhoonBearing')} value={t(dirKey(bearingDeg(r.city.latitude, r.city.longitude, c.latitude, c.longitude)))} />
                <PanelStat label={t('typhoonLevel')} value={levelLabel} />
                <PanelStat label={t('typhoonUpdated')} value={updated} />
              </View>
            )}

            <View style={panelText.divider} />
            <Text style={panelText.note}>{t('typhoonNote')}</Text>
          </ScrollView>
        </Panel>
      </Rise>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E1A33' },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  radar: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  panelWrap: { maxHeight: '58%', marginHorizontal: spacing.md },
  panel: { padding: 0, gap: 0, flexShrink: 1 },
  panelContent: { padding: spacing.lg, gap: spacing.lg },
});
