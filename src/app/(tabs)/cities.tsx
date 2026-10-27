import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkyBackground } from '../../components/SkyBackground';
import { CITIES } from '../../constants/cities';
import { CheckIcon } from '../../components/Icons';
import { colors, radius, spacing, type } from '../../constants/theme';
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
                {on && <CheckIcon color={colors.glow} size={20} />}
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
  title: { ...type.largeTitle, color: colors.text, marginVertical: spacing.sm },
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
  name: { ...type.headline, fontSize: 17, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
});
