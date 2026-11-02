// A poster of the moon on someone's birthday, sized for sharing: the date set
// large in the top corner with the phase under it, the moon big on a dark ground, that night's
// moon facts in a grid, and the app's icon at the foot.
import type { ComponentRef, Ref } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { MoonDisc } from './MoonDisc';
import { Text } from './Text';

export const SHARE_CARD_WIDTH = 340;
// A tall poster, about the shape of a phone screen less its bars.
const HEIGHT = Math.round(SHARE_CARD_WIDTH * 1.66);
const PAD = 26;
// One flat black, so the moon's dark side melts into it.
const GROUND = '#08080A';
const MOON = 256;
const MOON_TOP = 118;

const ICON = require('../../assets/icon.png');

export type ShareCardInfo = {
  eyebrow: string;
  phase: string;
  /** The date written the English way, e.g. Dec 29, 1990. */
  when: string;
  /** Six facts, read across in rows of three. */
  stats: { label: string; value: string }[];
};

type Props = ShareCardInfo & {
  illumination: number;
  waxing: boolean;
  ref?: Ref<ComponentRef<typeof View>>;
};

export function BirthShareCard({ illumination, waxing, eyebrow, phase, when, stats, ref }: Props) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.when} numberOfLines={1} adjustsFontSizeToFit>
          {when}
        </Text>
        <Text style={styles.phase}>{phase}</Text>
      </View>

      <View style={styles.moon}>
        <MoonDisc size={MOON} illumination={illumination} waxing={waxing} unlit={GROUND} />
      </View>

      <View style={styles.grid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.foot}>
        <Image source={ICON} style={styles.icon} />
        <Text style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: SHARE_CARD_WIDTH, height: HEIGHT, borderRadius: 24, overflow: 'hidden', backgroundColor: GROUND },
  head: { position: 'absolute', top: PAD + 6, left: PAD, right: PAD },
  // Thin and quiet, so the moon stays the first thing you see.
  when: { fontSize: 22, lineHeight: 28, fontWeight: '200', letterSpacing: 1.5, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  phase: { fontSize: 11, lineHeight: 15, fontWeight: '400', letterSpacing: 4, color: 'rgba(255,255,255,0.55)', marginTop: 6 },
  moon: { position: 'absolute', top: MOON_TOP, left: (SHARE_CARD_WIDTH - MOON) / 2 },
  grid: { position: 'absolute', left: PAD, right: PAD, bottom: 62, flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  stat: { width: '33.33%', gap: 3, paddingRight: 8 },
  statLabel: { fontSize: 9, letterSpacing: 0.5, color: 'rgba(255,255,255,0.55)' },
  statValue: { fontSize: 14, fontWeight: '400', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  foot: {
    position: 'absolute',
    left: PAD,
    right: PAD,
    bottom: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  icon: { width: 22, height: 22, borderRadius: 6 },
  eyebrow: { flexShrink: 1, fontSize: 10, letterSpacing: 1, color: colors.textDim },
});
