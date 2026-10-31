// The after-sunset question, opened by tapping its notification: three answers,
// one tap, then a thank-you. The buttons on the notification do the same without this page.
// Each answer carries a little swatch of that sky, so they read at a glance.
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton, useCloseButtonClearance } from '../components/CloseButton';
import { Glass, type Aura } from '../components/Glass';
import { Rise } from '../components/Motion';
import { Text } from '../components/Text';
import { TonightBackdrop } from '../components/TonightBackdrop';
import { colors, spacing, type } from '../constants/theme';
import { RATINGS, submitFeedback, type FeedbackAsk, type Rating } from '../lib/feedback';
import { formatTime } from '../lib/format';
import type { StringKey } from '../lib/i18n/strings';
import { useSettings } from '../lib/settings';

const SKIES: Record<Rating, { swatch: readonly [string, string, ...string[]]; desc: StringKey; aura: Aura }> = {
  0: { swatch: ['#2A3050', '#4A5274', '#6B7290'], desc: 'feedbackNoneDesc', aura: { color: '#8FA8FF', x: 0.1, y: 0.5, strength: 0.1 } },
  1: { swatch: ['#2E3166', '#A86A8C', '#F0B184'], desc: 'feedbackSomeDesc', aura: { color: '#FFB86B', x: 0.1, y: 0.5, strength: 0.2 } },
  2: { swatch: ['#4A1838', '#D9422F', '#FFB25C'], desc: 'feedbackFireDesc', aura: { color: '#FF5A36', x: 0.1, y: 0.5, strength: 0.32 } },
};

export default function FeedbackScene() {
  const { t, lang } = useSettings();
  const router = useRouter();
  const clearance = useCloseButtonClearance();
  const { ask: raw } = useLocalSearchParams<{ ask?: string }>();
  const [picked, setPicked] = useState<Rating | null>(null);
  let ask: FeedbackAsk | null = null;
  try {
    ask = raw ? (JSON.parse(raw) as FeedbackAsk) : null;
  } catch {}

  const answer = (r: Rating) => {
    if (!ask || picked !== null) return;
    submitFeedback(ask, r, lang).catch(() => {});
    setPicked(r);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 1600);
  };

  const sunset = ask?.timezone ? formatTime(new Date(ask.sunset), ask.timezone, lang) : null;

  return (
    <View style={styles.fill}>
      <TonightBackdrop phase="dusk" />
      <SafeAreaView style={[styles.fill, styles.page, { paddingBottom: clearance }]}>
        {picked !== null || !ask ? (
          <Rise style={styles.thanks}>
            {picked !== null && <LinearGradient colors={SKIES[picked].swatch} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.thanksSwatch} />}
            <Text style={styles.title}>{t('feedbackThanks')}</Text>
            <Text style={styles.sub}>{t('feedbackThanksSub')}</Text>
          </Rise>
        ) : (
          <>
            <Rise style={styles.header}>
              <Text style={styles.eyebrow}>{sunset ? t('feedbackWhere', { city: ask.cityName, time: sunset }) : ask.cityName}</Text>
              <Text style={styles.title}>{t('feedbackQuestion')}</Text>
            </Rise>
            <Rise delay={80} style={styles.answers}>
              {RATINGS.map((r) => (
                <Glass key={r.value} onPress={() => answer(r.value)} aura={SKIES[r.value].aura} radius={20} contentStyle={styles.answer}>
                  <LinearGradient colors={SKIES[r.value].swatch} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.swatch} />
                  <View style={styles.answerText}>
                    <Text style={styles.answerLabel}>{t(r.label)}</Text>
                    <Text style={styles.answerDesc}>{t(SKIES[r.value].desc)}</Text>
                  </View>
                </Glass>
              ))}
            </Rise>
            <Text style={styles.note}>{t('feedbackWhy')}</Text>
          </>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { justifyContent: 'center', paddingHorizontal: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.xl },
  eyebrow: { ...type.caption, fontWeight: '500', color: colors.glow, letterSpacing: 0.4 },
  title: { fontSize: 24, fontWeight: '500', letterSpacing: -0.3, color: colors.text },
  sub: { ...type.body, color: colors.textDim },
  answers: { gap: 10 },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14 },
  swatch: { width: 40, height: 40, borderRadius: 12 },
  answerText: { flex: 1, gap: 2 },
  answerLabel: { ...type.headline, color: colors.text },
  answerDesc: { ...type.caption, color: colors.textDim },
  note: { ...type.caption, color: colors.textDim, opacity: 0.8, marginTop: spacing.lg },
  thanks: { gap: spacing.sm },
  thanksSwatch: { width: 56, height: 56, borderRadius: 16, marginBottom: spacing.sm },
});
