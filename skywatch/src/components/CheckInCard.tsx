// The after-sunset question as a card on the Tonight page: shown from a little after
// sunset until late in the evening for the first followed city, answered with one tap
// on a swatch, or closed. Same evenings and same answer as the notification, so an
// evening is only ever asked once; answering here withdraws the notification.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FEEDBACK_SKIES } from '../constants/feedbackSkies';
import { colors, spacing, type } from '../constants/theme';
import { dismissAsk, eveningAskFor, isAnswered, isDismissed, RATINGS, submitFeedback, type FeedbackAsk, type Rating } from '../lib/feedback';
import { formatTime } from '../lib/format';
import { useSettings } from '../lib/settings';
import type { CityReport } from '../lib/sky/report';
import { Glass } from './Glass';
import { CloseIcon } from './Icons';
import { Rise } from './Motion';
import { Text } from './Text';

// Long enough to read the thanks before the card goes.
const THANKS_MS = 2400;

export function CheckInCard({ r }: { r: CityReport }) {
  const { t, lang, settings } = useSettings();
  // Whether the evening below is still open: not yet answered here or on the notification, and not closed.
  const [checked, setChecked] = useState<{ key: string; open: boolean } | null>(null);
  const [picked, setPicked] = useState<Rating | null>(null);
  const [gone, setGone] = useState(false);

  // Look again every minute, so the card turns up once the evening's colour has had its moment.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const candidate = settings.alerts.feedback === false ? null : eveningAskFor(r, r.city.name[lang], now);
  const key = candidate?.key ?? null;
  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all([isAnswered(key), isDismissed(key)])
      .then(([answered, dismissed]) => live && setChecked({ key, open: !answered && !dismissed }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);

  const ask: FeedbackAsk | null = candidate && checked?.key === candidate.key && checked.open ? candidate : null;
  if (!ask || gone) return null;

  const answer = (rating: Rating) => {
    if (picked !== null) return;
    setPicked(rating);
    submitFeedback(ask, rating, lang).catch(() => {});
    setTimeout(() => setGone(true), THANKS_MS);
  };
  const close = () => {
    setGone(true);
    dismissAsk(ask.key).catch(() => {});
  };
  const sunset = formatTime(new Date(ask.sunset), r.city.timezone, lang);

  return (
    <Rise>
      <Glass aura={picked !== null ? FEEDBACK_SKIES[picked].aura : { color: '#FFB86B', x: 0.85, y: 1, strength: 0.18 }} contentStyle={styles.content} sheen>
        {picked === null ? (
          <>
            <View style={styles.top}>
              <View style={styles.titles}>
                <Text style={styles.eyebrow}>{t('feedbackWhere', { city: ask.cityName, time: sunset })}</Text>
                <Text style={styles.title}>{t('feedbackQuestion')}</Text>
              </View>
              <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.close}>
                <CloseIcon color={colors.textDim} size={14} />
              </Pressable>
            </View>
            <View style={styles.answers}>
              {RATINGS.map((o) => (
                <Pressable key={o.value} onPress={() => answer(o.value)} accessibilityRole="button" accessibilityLabel={t(o.label)} style={({ pressed }) => [styles.answer, pressed && styles.pressed]}>
                  <LinearGradient colors={FEEDBACK_SKIES[o.value].swatch} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.swatch} />
                  <Text style={styles.answerLabel} numberOfLines={1}>
                    {t(o.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.thanks}>
            <LinearGradient colors={FEEDBACK_SKIES[picked].swatch} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.thanksSwatch} />
            <View style={styles.titles}>
              <Text style={styles.title}>{t('feedbackThanks')}</Text>
              <Text style={styles.sub}>{t('feedbackThanksSub')}</Text>
            </View>
          </View>
        )}
      </Glass>
    </Rise>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md + 2 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titles: { flex: 1, gap: 4 },
  eyebrow: { ...type.caption, fontWeight: '500', color: colors.glow, letterSpacing: 0.4 },
  title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.2, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  close: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  answers: { flexDirection: 'row', gap: 10 },
  answer: { flex: 1, gap: 8, alignItems: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  swatch: { alignSelf: 'stretch', height: 54, borderRadius: 16 },
  answerLabel: { ...type.caption, fontWeight: '500', color: colors.text },
  thanks: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thanksSwatch: { width: 44, height: 44, borderRadius: 13 },
});
