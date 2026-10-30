// The after-sunset question, opened by tapping its notification: three answers,
// one tap, then a thank-you. The buttons on the notification do the same without this page.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseButton } from '../components/CloseButton';
import { Glass, type Aura } from '../components/Glass';
import { Rise } from '../components/Motion';
import { Text } from '../components/Text';
import { TonightBackdrop } from '../components/TonightBackdrop';
import { colors, spacing, type } from '../constants/theme';
import { RATINGS, submitFeedback, type FeedbackAsk, type Rating } from '../lib/feedback';
import { useSettings } from '../lib/settings';

const AURAS: Record<Rating, Aura> = {
  0: { color: '#8FA8FF', x: 0.5, y: 1.1, strength: 0.12 },
  1: { color: '#FFB86B', x: 0.5, y: 1.1, strength: 0.3 },
  2: { color: '#FF5A36', x: 0.5, y: 1.1, strength: 0.5 },
};

export default function FeedbackScene() {
  const { t, lang } = useSettings();
  const router = useRouter();
  const { ask: raw } = useLocalSearchParams<{ ask?: string }>();
  const [done, setDone] = useState(false);
  let ask: FeedbackAsk | null = null;
  try {
    ask = raw ? (JSON.parse(raw) as FeedbackAsk) : null;
  } catch {}

  const answer = (r: Rating) => {
    if (!ask) return;
    submitFeedback(ask, r, lang).catch(() => {});
    setDone(true);
    setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/')), 1400);
  };

  return (
    <View style={styles.fill}>
      <TonightBackdrop phase="dusk" />
      <SafeAreaView style={[styles.fill, styles.content]}>
        {done || !ask ? (
          <Rise style={styles.header}>
            <Text style={styles.title}>{t('feedbackThanks')}</Text>
            <Text style={styles.sub}>{t('feedbackThanksSub')}</Text>
          </Rise>
        ) : (
          <>
            <Rise style={styles.header}>
              <Text style={styles.eyebrow}>{ask.cityName}</Text>
              <Text style={styles.title}>{t('feedbackQuestion')}</Text>
              <Text style={styles.sub}>{t('feedbackWhy')}</Text>
            </Rise>
            <Rise delay={80} style={styles.answers}>
              {RATINGS.map((r) => (
                <Glass key={r.value} onPress={() => answer(r.value)} aura={AURAS[r.value]} radius={22} contentStyle={styles.answer}>
                  <Text style={styles.answerText}>{t(r.label)}</Text>
                </Glass>
              ))}
            </Rise>
          </>
        )}
      </SafeAreaView>
      <CloseButton />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { justifyContent: 'center', paddingHorizontal: spacing.md, gap: spacing.xl },
  header: { gap: spacing.sm, alignItems: 'center' },
  eyebrow: { ...type.label, color: colors.glow },
  title: { ...type.largeTitle, color: colors.text, textAlign: 'center' },
  sub: { ...type.body, color: colors.textDim, textAlign: 'center' },
  answers: { gap: spacing.sm },
  answer: { paddingVertical: spacing.md + 2, alignItems: 'center' },
  answerText: { ...type.title, color: colors.text },
});
