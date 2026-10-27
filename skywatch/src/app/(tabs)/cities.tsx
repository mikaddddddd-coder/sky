import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CJK_FONT, Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { CheckIcon, CloseIcon, LocateIcon, PlusIcon, SearchIcon } from '../../components/Icons';
import { SceneBackground } from '../../components/SceneBackground';
import { CITIES, HERE_ID, type City } from '../../constants/cities';
import { colors, spacing, type } from '../../constants/theme';
import { cityFromPlace, locateHere, placeRegion, searchPlaces, type Place } from '../../lib/places';
import { useSettings } from '../../lib/settings';

type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; results: Place[] };

export default function CitiesScreen() {
  const { settings, update, t, lang } = useSettings();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState<SearchState>({ status: 'idle', results: [] });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [adding, setAdding] = useState<number | null>(null);

  const here = settings.customCities.find((c) => c.id === HERE_ID);
  const searched = settings.customCities.filter((c) => c.source === 'search');
  const isOn = (id: string) => settings.cityIds.includes(id);

  // Search as you type, after a short pause, cancelling the previous request.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ status: 'idle', results: [] });
      return;
    }
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setSearch((s) => ({ ...s, status: 'loading' }));
      searchPlaces(q, lang, abort.signal)
        .then((results) => setSearch({ status: 'done', results }))
        .catch(() => !abort.signal.aborted && setSearch({ status: 'error', results: [] }));
    }, 350);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query, lang]);

  const toggle = (id: string) => {
    const selected = isOn(id);
    if (selected && settings.cityIds.length === 1) return; // keep at least one city
    update({ cityIds: selected ? settings.cityIds.filter((c) => c !== id) : [...settings.cityIds, id] });
  };

  const followLocation = async () => {
    if (here && isOn(HERE_ID)) return toggle(HERE_ID);
    setLocating(true);
    setLocateError(null);
    const res = await locateHere(true);
    setLocating(false);
    if (!('city' in res)) return setLocateError(t(res.error === 'denied' ? 'cityLocateDenied' : 'cityLocateFailed'));
    // The location city leads the Tonight screen.
    update({
      customCities: [...settings.customCities.filter((c) => c.id !== HERE_ID), res.city],
      cityIds: [HERE_ID, ...settings.cityIds.filter((id) => id !== HERE_ID)],
    });
  };

  const add = async (place: Place) => {
    const id = `place-${place.id}`;
    if (settings.customCities.some((c) => c.id === id)) {
      if (!isOn(id)) toggle(id);
    } else {
      setAdding(place.id);
      const city = await cityFromPlace(place, lang);
      setAdding(null);
      update({ customCities: [...settings.customCities, city], cityIds: [...settings.cityIds, id] });
    }
    setQuery('');
  };

  const remove = (city: City) => {
    const ids = settings.cityIds.filter((id) => id !== city.id);
    update({
      customCities: settings.customCities.filter((c) => c.id !== city.id),
      cityIds: ids.length ? ids : [CITIES[0].id],
    });
  };

  const cityRow = (c: City, removable: boolean) => {
    const on = isOn(c.id);
    const sub = c.region || c.name[lang === 'zh' ? 'en' : 'zh'];
    return (
      <Glass key={c.id} onPress={() => toggle(c.id)} tone="dark" radius={22} style={on ? styles.itemOn : undefined}>
        <View style={styles.item}>
          <View style={styles.itemText}>
            <Text style={styles.name}>{c.name[lang]}</Text>
            {!!sub && sub !== c.name[lang] && <Text style={styles.sub}>{sub}</Text>}
          </View>
          {on && <CheckIcon color={colors.text} size={20} />}
          {removable && (
            <Pressable
              onPress={() => remove(c)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('cityRemove', { city: c.name[lang] })}
              style={styles.remove}
            >
              <CloseIcon color={colors.textDim} size={16} />
            </Pressable>
          )}
        </View>
      </Glass>
    );
  };

  return (
    <View style={styles.safe}>
      <SceneBackground scene="night" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('selectCities')}</Text>

          <Glass tone="dark" radius={22}>
            <View style={styles.searchRow}>
              <SearchIcon color={colors.textDim} size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('citySearchPlaceholder')}
                placeholderTextColor={colors.textDim}
                style={[styles.input, lang === 'zh' && { fontFamily: CJK_FONT }]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {search.status === 'loading' && <ActivityIndicator color={colors.textDim} size="small" />}
            </View>
          </Glass>

          {query.trim().length >= 2 && search.status !== 'loading' && (
            <View style={styles.results}>
              {search.status === 'error' && <Text style={styles.note}>{t('citySearchFailed')}</Text>}
              {search.status === 'done' && !search.results.length && <Text style={styles.note}>{t('citySearchEmpty')}</Text>}
              {search.results.map((p) => (
                <Glass key={p.id} onPress={() => add(p)} radius={18}>
                  <View style={styles.item}>
                    <View style={styles.itemText}>
                      <Text style={styles.name}>{p.name}</Text>
                      {!!placeRegion(p) && <Text style={styles.sub}>{placeRegion(p)}</Text>}
                    </View>
                    {adding === p.id ? <ActivityIndicator color={colors.text} size="small" /> : <PlusIcon color={colors.text} size={20} />}
                  </View>
                </Glass>
              ))}
            </View>
          )}

          <Glass onPress={followLocation} tone="dark" radius={22} style={here && isOn(HERE_ID) ? styles.itemOn : undefined}>
            <View style={styles.item}>
              <LocateIcon color={colors.typhoon} size={20} />
              <View style={styles.itemText}>
                <Text style={styles.name}>{here ? here.name[lang] : t('cityUseLocation')}</Text>
                <Text style={styles.sub}>{locating ? t('cityLocating') : here ? t('cityHere') : t('cityUseLocationDesc')}</Text>
              </View>
              {locating ? <ActivityIndicator color={colors.text} size="small" /> : here && isOn(HERE_ID) && <CheckIcon color={colors.text} size={20} />}
            </View>
          </Glass>
          {locateError && <Text style={styles.note}>{locateError}</Text>}

          {searched.map((c) => cityRow(c, true))}
          {CITIES.map((c) => cityRow(c, false))}

          <Text style={styles.hint}>{t('citiesHint')}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: 110 },
  title: { ...type.largeTitle, color: colors.text, marginVertical: spacing.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: -4 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 6 },
  results: { gap: spacing.sm, marginBottom: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemText: { flex: 1 },
  itemOn: { borderColor: 'rgba(255,255,255,0.7)' },
  name: { ...type.headline, fontSize: 17, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  remove: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  note: { ...type.caption, color: colors.textDim, paddingHorizontal: spacing.sm },
  hint: { ...type.caption, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm },
});
