import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { SceneBackground } from '../../components/SceneBackground';
import { CITIES } from '../../constants/cities';
import { CheckIcon } from '../../components/Icons';
import { colors, spacing, type } from '../../constants/theme';
import { useSettings } from '../../lib/settings';

export default function CitiesScreen() {
  const { settings, update, t, lang } = useSettings();

  const toggle = (id: string) => {
    const selected = settings.cityIds.includes(id);
    if (selected && settings.cityIds.length === 1) return; // keep at least one city
    update({ cityIds: selected ? settings.cityIds.filter((c) => c !== id) : [...settings.cityIds, id] });
  };

  return (
    <View style={styles.safe}>
      <SceneBackground scene="night" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('selectCities')}</Text>
          {CITIES.map((c) => {
            const on = settings.cityIds.includes(c.id);
            return (
              <Glass key={c.id} onPress={() => toggle(c.id)} tone="dark" radius={22} style={on ? styles.itemOn : undefined}>
                <View style={styles.item}>
                <View>
                  <Text style={styles.name}>{c.name[lang]}</Text>
                  <Text style={styles.sub}>{c.name[lang === 'zh' ? 'en' : 'zh']}</Text>
                </View>
                {on && <CheckIcon color={colors.text} size={20} />}
                </View>
              </Glass>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 110 },
  title: { ...type.largeTitle, color: colors.text, marginVertical: spacing.sm },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemOn: { borderColor: 'rgba(255,255,255,0.7)' },
  name: { ...type.headline, fontSize: 17, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
});
