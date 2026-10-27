import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { MoonDial } from '../components/MoonDial';
import { MoonDisc } from '../components/MoonDisc';
import { Rise } from '../components/Motion';
import { SceneBackground } from '../components/SceneBackground';
import { colors, spacing, type } from '../constants/theme';
import { formatTime } from '../lib/format';
import { useCityReport } from '../lib/report';
import { useSettings } from '../lib/settings';

export default function MoonScene() {
  const { city } = useLocalSearchParams<{ city?: string }>();
  const r = useCityReport(city);
  const { t, lang } = useSettings();
  // Size the moon to the space left after the text, so short screens never overlap.
  const [heroH, setHeroH] = useState(0);
  const moonSize = heroH ? Math.max(120, Math.min(220, heroH - 170)) : 0;
  if (!r) return <SceneBackground scene="moon" fadeIn />;

  const m = r.sky.moon;
  const time = (d: Date) => formatTime(d, r.city.timezone, lang);
  const date = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: r.city.timezone,
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  return (
    <View style={styles.fill}>
      <SceneBackground scene="moon" fadeIn />
      <SafeAreaView style={styles.fill}>
        <Rise style={styles.header}>
          <Text style={styles.title}>{t('moonTitle')}</Text>
          <Text style={styles.titleDim}>
            {r.city.name[lang]} · {date}
          </Text>
        </Rise>

        <View style={styles.hero} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
          {/* The moon rises slowly into place, then the text follows. */}
          {moonSize > 0 && (
            <Rise distance={60} duration={1400} delay={100}>
              <MoonDisc size={moonSize} illumination={m.illumination} waxing={m.waxing} />
            </Rise>
          )}
          <Rise delay={700} style={styles.heroText}>
            <Text style={styles.phase}>{t(`phase_${m.phaseName}`)}</Text>
            {m.moonrise && <Text style={styles.rise}>{t('moonrise_label')} {time(m.moonrise)}</Text>}
          </Rise>
          <Rise delay={850} style={styles.heroText}>
            <Text style={styles.note}>
              {t('moonIllumination', { pct: Math.round(m.illumination * 100) })} ·{' '}
              {t('moonAltNow', { deg: Math.round(m.altitudeAfterSunset) })}
            </Text>
            <Text style={styles.highlight}>{t(`moon_highlight_${m.highlight}`)}</Text>
          </Rise>
        </View>

        {m.moonrise && m.moonset && (
          <View style={styles.dial}>
            <MoonDial rise={m.moonrise} set={m.moonset} now={new Date()} label={time} />
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
  heroText: { alignItems: 'center', gap: spacing.sm },
  phase: { fontSize: 30, fontWeight: '600', letterSpacing: -0.4, color: colors.text, marginTop: spacing.sm },
  rise: { ...type.headline, fontWeight: '500', color: colors.moonTime, fontVariant: ['tabular-nums'] },
  note: { ...type.caption, color: colors.textDim, fontVariant: ['tabular-nums'] },
  highlight: { ...type.body, color: colors.text, marginTop: spacing.xs, paddingHorizontal: spacing.lg, textAlign: 'center' },
  dial: { paddingHorizontal: spacing.md, marginBottom: 84, marginTop: spacing.sm },
});
