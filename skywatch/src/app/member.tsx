// The membership offer, set on the same dusk sky and frosted cards as the
// Tonight page: what it unlocks, three plans side by side, one button.
// There is no payment yet, so the button just turns membership on.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, type Aura } from '../components/Glass';
import { BellIcon, CalendarIcon, CloseIcon, SunriseIcon } from '../components/Icons';
import { Rise } from '../components/Motion';
import { Text } from '../components/Text';
import { TonightBackdrop } from '../components/TonightBackdrop';
import { colors, spacing } from '../constants/theme';
import type { StringKey } from '../lib/i18n/strings';
import { useSettings } from '../lib/settings';

const PERKS: { Icon: typeof BellIcon; title: StringKey; desc: StringKey }[] = [
  { Icon: CalendarIcon, title: 'memberPerkWeek', desc: 'memberPerkWeekDesc' },
  { Icon: SunriseIcon, title: 'memberPerkDawn', desc: 'memberPerkDawnDesc' },
  { Icon: BellIcon, title: 'memberPerkPush', desc: 'memberPerkPushDesc' },
];

type Plan = 'yearly' | 'monthly' | 'lifetime';
const PLANS: { id: Plan; name: StringKey; amount: { zh: string; en: string }; unit: StringKey; note: StringKey }[] = [
  { id: 'monthly', name: 'memberMonthly', amount: { zh: '9', en: '1.99' }, unit: 'memberPerMonth', note: 'memberMonthlyNote' },
  { id: 'yearly', name: 'memberYearly', amount: { zh: '58', en: '9.99' }, unit: 'memberPerYear', note: 'memberYearlyNote' },
  { id: 'lifetime', name: 'memberLifetime', amount: { zh: '128', en: '24.99' }, unit: 'memberOnce', note: 'memberLifetimeNote' },
];

// The same warm light the glow card carries, so the offer reads as part of that card's world.
const CARD_AURA: Aura = { color: '#FF7444', x: 0.85, y: 1, strength: 0.3 };
const PICKED_AURA: Aura = { color: '#FF7444', x: 0.5, y: 1.1, strength: 0.45 };
const QUIET_AURA: Aura = { color: '#8FA8FF', x: 0.5, y: 1.1, strength: 0.12 };

export default function MemberScene() {
  const { t, lang, update } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('yearly');
  const currency = lang === 'zh' ? '¥' : '$';
  const picked = PLANS.find((p) => p.id === plan)!;
  const price = `${currency}${picked.amount[lang]} ${t(picked.unit)}`;

  const start = () => {
    update({ member: true });
    router.back();
  };
  const restore = () => Alert.alert(t('memberRestore'), t('memberDemo'));

  return (
    <View style={styles.fill}>
      <TonightBackdrop phase="dusk" />
      <SafeAreaView style={styles.fill} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')} style={styles.close}>
            <CloseIcon color={colors.text} size={18} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Rise style={styles.header}>
            <Text style={styles.eyebrow}>{t('memberTitle')}</Text>
            <Text style={styles.title}>{t('memberLead')}</Text>
            <Text style={styles.sub}>{t('memberSub')}</Text>
          </Rise>

          <Rise delay={80}>
            <Glass aura={CARD_AURA} sheen contentStyle={styles.perks}>
              {PERKS.map(({ Icon, title, desc }) => (
                <View key={title} style={styles.perk}>
                  <Icon color={colors.glow} size={24} />
                  <View style={styles.perkText}>
                    <Text style={styles.perkTitle}>{t(title)}</Text>
                    <Text style={styles.perkDesc}>{t(desc)}</Text>
                  </View>
                </View>
              ))}
            </Glass>
          </Rise>

          <Rise delay={160} style={styles.plans}>
            {PLANS.map((p) => {
              const on = plan === p.id;
              return (
                <View key={p.id} style={styles.planWrap}>
                  <Glass onPress={() => setPlan(p.id)} aura={on ? PICKED_AURA : QUIET_AURA} sheen={on} radius={22} contentStyle={styles.plan} style={on && styles.planOn}>
                    <Text style={[styles.planName, on && styles.planNameOn]}>{t(p.name)}</Text>
                    <View style={styles.amountRow}>
                      <Text style={styles.currency}>{currency}</Text>
                      <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                        {p.amount[lang]}
                      </Text>
                    </View>
                    <Text style={styles.unit}>{t(p.unit)}</Text>
                    <Text style={styles.planNote} numberOfLines={1} adjustsFontSizeToFit>
                      {t(p.note)}
                    </Text>
                  </Glass>
                  {/* Only the yearly plan comes with the trial, which is what makes it the one to pick. */}
                  {p.id === 'yearly' && (
                    <View style={styles.badge} pointerEvents="none">
                      <Text style={styles.badgeText}>{t('memberTrialBadge')}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Rise>
        </ScrollView>

        {/* The one action stays put at the bottom, with the fine print under it. */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Text style={styles.renew}>
            {plan === 'yearly' ? t('memberRenew', { price }) : plan === 'monthly' ? t('memberRenewMonthly') : t('memberRenewOnce')}
          </Text>
          <Pressable onPress={start} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>
              {plan === 'yearly'
                ? t('memberTrial')
                : plan === 'monthly'
                  ? t('memberSubscribe', { price })
                  : `${currency}${picked.amount[lang]} · ${t('memberBuyOnce')}`}
            </Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable onPress={restore} hitSlop={6}>
              <Text style={styles.link}>{t('memberRestore')}</Text>
            </Pressable>
            <Text style={styles.linkDot}>·</Text>
            <Text style={styles.link}>{t('memberTerms')}</Text>
            <Text style={styles.linkDot}>·</Text>
            <Text style={styles.link}>{t('memberPrivacy')}</Text>
          </View>
          <Text style={styles.demo}>{t('memberDemo')}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  // Same small spaced label that names each card on the Tonight page.
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.8, color: 'rgba(245,243,255,0.5)' },
  title: { fontSize: 30, fontWeight: '600', letterSpacing: -0.6, color: colors.text },
  sub: { fontSize: 15, color: colors.textDim },
  perks: { gap: spacing.md + 2 },
  perk: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  perkText: { flex: 1, gap: 3 },
  perkTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  perkDesc: { fontSize: 13, lineHeight: 18, color: colors.textDim },
  plans: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  planWrap: { flex: 1 },
  plan: { alignItems: 'center', paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xs, gap: 2 },
  planOn: { borderWidth: 1, borderColor: 'rgba(255,138,91,0.7)' },
  planName: { fontSize: 13, fontWeight: '500', color: colors.textDim, marginBottom: 4 },
  planNameOn: { color: colors.text },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start' },
  currency: { fontSize: 15, fontWeight: '300', color: colors.textDim, marginTop: 6, marginRight: 1 },
  // Large and light, like the numbers on the Tonight cards.
  amount: { fontSize: 38, lineHeight: 44, fontWeight: '200', letterSpacing: -1, color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 12, color: colors.textDim },
  planNote: { fontSize: 11, color: 'rgba(245,243,255,0.5)', marginTop: 6 },
  badge: {
    position: 'absolute',
    top: -9,
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.glow,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1A0E10' },
  footer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  renew: { fontSize: 12, color: colors.textDim, textAlign: 'center' },
  cta: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 16, borderRadius: 20, backgroundColor: colors.glow },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#1A0E10' },
  links: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontSize: 12, color: 'rgba(245,243,255,0.55)' },
  linkDot: { fontSize: 12, color: 'rgba(245,243,255,0.35)' },
  demo: { fontSize: 11, color: 'rgba(245,243,255,0.35)' },
});
