import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkyBackground } from '../../components/SkyBackground';
import { CITIES } from '../../constants/cities';
import { colors, radius, spacing } from '../../constants/theme';
import { useSettings } from '../../lib/settings';

export default function CitiesScreen() {
  const { settings, update, t, lang } = useSettings();

  const toggle = (id: string) => {
    const selected = settings.cityIds.includes(id);
    if (selected && settings.cityIds.length === 1) return; // keep at least one city
    update({ cityIds: selected ? settings.cityIds.filter((c) => c !== id) : [...settings.cityIds, id] });
  };

  return (
    <SkyBackground phase="night">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('selectCities')}</Text>
          {CITIES.map((c) => {
            const on = settings.cityIds.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggle(c.id)} style={[styles.item, on && styles.itemOn]}>
                <View>
                  <Text style={styles.name}>{c.name[lang]}</Text>
                  <Text style={styles.sub}>{c.name[lang === 'zh' ? 'en' : 'zh']}</Text>
                </View>
                <Text style={styles.check}>{on ? '✓' : ''}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginVertical: spacing.sm },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  itemOn: { borderColor: colors.glow },
  name: { color: colors.text, fontSize: 18, fontWeight: '600' },
  sub: { color: colors.textDim, fontSize: 12 },
  check: { color: colors.glow, fontSize: 20, fontWeight: '700' },
});
