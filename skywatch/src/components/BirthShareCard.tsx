// A picture of the moon on someone's birthday, sized for sharing: the moon large
// on a night sky, the date in big light figures under it, and a couple of facts.
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SKY_GRADIENTS, colors, spacing } from '../constants/theme';
import { MoonDisc } from './MoonDisc';
import { Text } from './Text';
import { useSvgId } from './useSvgId';

export const SHARE_CARD_WIDTH = 340;
// 2:3, a comfortable portrait for chat apps and stories.
const HEIGHT = Math.round(SHARE_CARD_WIDTH * 1.5);
const MOON = 206;
const MOON_TOP = 58;

// Drawn stars for when there is no photo: seeded, so the sky is the same every time.
const STARS = (() => {
  let s = 11;
  const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: 90 }, () => ({ x: rand(), y: rand() * 0.75, r: rand() > 0.9 ? 1.1 : 0.4 + rand() * 0.5, o: 0.2 + rand() * 0.6 }));
})();

export type ShareCardInfo = {
  eyebrow: string;
  phase: string;
  /** The date as figures, e.g. 1990.12.29. */
  when: string;
  stats: { label: string; value: string }[];
  note: string;
  brand: string;
};

type Props = ShareCardInfo & {
  illumination: number;
  waxing: boolean;
  /** A photographed night sky; without one the card draws its own stars. */
  sky?: ImageSourcePropType;
  ref?: Ref<ComponentRef<typeof View>>;
};

export function BirthShareCard({ illumination, waxing, sky, eyebrow, phase, when, stats, note, brand, ref }: Props) {
  const id = useSvgId('shareMoon');
  const glow = MOON * 1.9;
  const cx = SHARE_CARD_WIDTH / 2;
  const cy = MOON_TOP + MOON / 2;
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      {sky ? <Image source={sky} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <LinearGradient colors={SKY_GRADIENTS.night} style={StyleSheet.absoluteFill} />}
      <Svg width={SHARE_CARD_WIDTH} height={HEIGHT} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Darkens the sky right around the moon so its whole edge reads cleanly, then lets a faint glow out. */}
          <RadialGradient id={`${id}-clear`} cx="50%" cy="50%" r="50%">
            <Stop offset={0.5} stopColor="#02030A" stopOpacity={0.75} />
            <Stop offset={1} stopColor="#02030A" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <Stop offset={0.52} stopColor="#E9ECF7" stopOpacity={0.16} />
            <Stop offset={1} stopColor="#C9CEDF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {!sky && STARS.map((st, i) => <Circle key={i} cx={st.x * SHARE_CARD_WIDTH} cy={st.y * HEIGHT} r={st.r} fill="#FFFFFF" fillOpacity={st.o} />)}
        <Circle cx={cx} cy={cy} r={glow / 2} fill={`url(#${id}-clear)`} />
        <Circle cx={cx} cy={cy} r={glow / 2} fill={`url(#${id}-glow)`} />
      </Svg>
      {/* Darker toward the bottom so the words sit on a calm ground. */}
      <LinearGradient colors={['rgba(2,3,10,0)', 'rgba(2,3,10,0.82)']} locations={[0.45, 0.85]} style={StyleSheet.absoluteFill} />

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <View style={styles.moon}>
        <MoonDisc size={MOON} illumination={illumination} waxing={waxing} />
      </View>

      <View style={styles.body}>
        <Text style={styles.when}>{when}</Text>
        <Text style={styles.phase}>{phase}</Text>
        <View style={styles.rule} />
        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>{note}</Text>
      </View>
      {/* In the flow, pushed to the bottom, so a long note can never run under it. */}
      <Text style={styles.brand}>{brand}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: SHARE_CARD_WIDTH, height: HEIGHT, borderRadius: 28, overflow: 'hidden', alignItems: 'center', backgroundColor: SKY_GRADIENTS.night[0] },
  eyebrow: { position: 'absolute', top: 26, fontSize: 11, fontWeight: '500', letterSpacing: 3, color: 'rgba(245,243,255,0.7)' },
  moon: { marginTop: MOON_TOP },
  body: { alignItems: 'center', marginTop: spacing.lg - 4, paddingHorizontal: spacing.lg, alignSelf: 'stretch' },
  when: { fontSize: 40, lineHeight: 46, fontWeight: '200', letterSpacing: 1, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  phase: { fontSize: 15, fontWeight: '500', letterSpacing: 2, color: colors.text, marginTop: 2 },
  rule: { width: 28, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.45)', marginVertical: spacing.md },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl + 8 },
  stat: { alignItems: 'center', gap: 3 },
  statLabel: { fontSize: 11, letterSpacing: 1, color: colors.textDim },
  statValue: { fontSize: 15, fontWeight: '500', color: colors.text, fontVariant: ['tabular-nums'] },
  note: { fontSize: 12, lineHeight: 17, color: colors.textDim, textAlign: 'center', marginTop: spacing.md },
  brand: { marginTop: 'auto', marginBottom: 16, fontSize: 10, letterSpacing: 2.5, color: 'rgba(245,243,255,0.45)' },
});
