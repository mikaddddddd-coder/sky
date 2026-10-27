import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityTonight } from '../../components/CityTonight';
import { SkyBackground, skyPhaseFor } from '../../components/SkyBackground';
import { colors, spacing, type } from '../../constants/theme';
import { formatTime } from '../../lib/format';
import { useSettings } from '../../lib/settings';
import { useTonightReport } from '../../lib/useTonightReport';

export default function TonightScreen() {
  const { t, lang } = useSettings();
  const { report, loading, error, refresh } = useTonightReport();

  const first = report?.cities[0];
  const phase = first ? skyPhaseFor(new Date(), first.sky.sun.sunset, first.sky.sun.civilDusk) : 'dusk';
  const cycloneCount = report?.activeCyclones.length ?? 0;

  return (
    <SkyBackground phase={phase}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading && !!report} onRefresh={refresh} tintColor={colors.text} />}
        >
          <Text style={styles.title}>{t('tonightTitle')}</Text>
          {report && first && (
            <Text style={styles.dim}>
              {t('updatedAt', { time: formatTime(report.generatedAt, first.city.timezone, lang) })} ·{' '}
              {cycloneCount ? t('typhoonActive', { n: cycloneCount }) : t('typhoonNone')}
            </Text>
          )}

          {!report && loading && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.text} />
              <Text style={styles.dim}>{t('loading')}</Text>
            </View>
          )}
          {error && <Text style={styles.error}>{t('loadError')}</Text>}

          {report?.cities.map((c) => <CityTonight key={c.city.id} report={c} />)}

          <Text style={styles.footer}>{t('dataSource')}</Text>
        </ScrollView>
      </SafeAreaView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  title: { ...type.largeTitle, color: colors.text, marginTop: spacing.sm },
  dim: { ...type.caption, color: colors.textDim },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  error: { color: colors.bad },
  footer: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
