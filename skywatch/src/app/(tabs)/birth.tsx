import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BirthShareCard, type ShareCardInfo } from '../../components/BirthShareCard';
import { Group, groupStyles, Row } from '../../components/GroupList';
import { CalendarIcon, CheckIcon, ChevronRightIcon, PinIcon, SearchIcon, SparkleIcon } from '../../components/Icons';
import { MoonDisc } from '../../components/MoonDisc';
import { Rise } from '../../components/Motion';
import { Panel, PanelStat, panelText } from '../../components/Panel';
import { SceneBackground } from '../../components/SceneBackground';
import { CJK_FONT, Text } from '../../components/Text';
import { CITIES, findCity, type City } from '../../constants/cities';
import { colors, spacing, type } from '../../constants/theme';
import { dirKey, formatTime } from '../../lib/format';
import { cityFromPlace, placeRegion, searchPlaces, type Place } from '../../lib/places';
import { useSettings } from '../../lib/settings';
import { computeBirthSky, conName, type Birth, type BirthSky, type Con } from '../../lib/sky/birth';

const pad = (n: number) => String(n).padStart(2, '0');
// The picker works in the phone's own zone; only the calendar fields are kept.
const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pickerValue = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0);
};
const DEFAULT_DATE = '2000-01-01';
const MIN_DATE = new Date(1900, 0, 1);

type SearchState = { status: 'idle' | 'loading' | 'done' | 'error'; results: Place[] };

/** The date row: the compact native picker on iOS, a tap that opens the dialog on Android. */
function DateValue({ value, onPick, label }: { value: Date; onPick: (d: Date) => void; label: string }) {
  const { lang } = useSettings();
  const [open, setOpen] = useState(false);
  const onValueChange = (_: unknown, d: Date) => {
    setOpen(false);
    onPick(d);
  };
  const common = { value, mode: 'date' as const, onValueChange, onDismiss: () => setOpen(false), maximumDate: new Date(), minimumDate: MIN_DATE };
  if (Platform.OS === 'ios')
    return <DateTimePicker {...common} display="compact" themeVariant="dark" accentColor={colors.glow} locale={lang === 'zh' ? 'zh-CN' : 'en-US'} />;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Text style={groupStyles.value}>{label}</Text>
      </Pressable>
      {open && <DateTimePicker {...common} />}
    </>
  );
}

function BirthCard({ birth, sky, onShare }: { birth: Birth; sky: BirthSky; onShare: () => void }) {
  const { t, lang } = useSettings();
  const { width } = useWindowDimensions();
  // The moon is the point of the card, so it takes most of the panel's width.
  const moonSize = Math.min(260, Math.round((width - 2 * spacing.md - 2 * spacing.lg) * 0.72));
  const { place } = birth;
  const time = (d: Date | null) => (d ? formatTime(d, place.timezone, lang) : '—');
  const dir = (az: number) => t(dirKey(az));
  const con = (c: Con) => conName(c, lang);
  const dateLabel = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: place.timezone, year: 'numeric', month: 'long', day: 'numeric' }).format(sky.at);

  const { moon } = sky;
  const moonLine = moon.altitude > 0 ? t('birthMoonEveningUp', { dir: dir(moon.azimuth) }) : t('birthMoonEveningDown');

  const up = sky.planets.filter((p) => p.where === 'up');
  const names = up.map((p) => t(`planet_${p.name}`)).join(t('birthJoin'));
  const planetsLine = !up.length
    ? t('birthPlanetsNone')
    : !sky.dark
      ? t('birthPlanetsDay', { names })
      : t('birthPlanetsSeenEvening', { names });

  return (
    <Panel tint={['rgba(30,34,70,0.14)', 'rgba(8,9,20,0.8)']} style={styles.card}>
      <Text style={panelText.sub}>{dateLabel}</Text>

      <View style={styles.hero}>
        <Rise distance={40} duration={1100}>
          <MoonDisc size={moonSize} illumination={moon.illumination} waxing={moon.waxing} />
        </Rise>
        <View style={[panelText.block, styles.heroText]}>
          <Text style={styles.phase}>{t(`phase_${moon.phaseName}`)}</Text>
          <Text style={[panelText.sub, styles.center]}>{moonLine}</Text>
        </View>
      </View>

      <View style={panelText.grid}>
        <PanelStat label={t('birthMoonIn')} value={con(moon.constellation)} />
        <PanelStat label={t('moonLit')} value={`${Math.round(moon.illumination * 100)}%`} />
        <PanelStat label={t('sunrise')} value={time(sky.sunrise)} />
        <PanelStat label={t('sunset')} value={time(sky.sunset)} />
      </View>
      <Text style={panelText.note}>{t('birthFullMoonsLine', { n: sky.fullMoonsSince })}</Text>

      <View style={panelText.divider} />

      <View style={panelText.block}>
        <Text style={panelText.section}>{t('birthPlanets')}</Text>
        <Text style={panelText.sub}>{planetsLine}</Text>
      </View>
      <View style={styles.planets}>
        {sky.planets.map((p) => {
          const seen = p.where === 'up' && sky.dark;
          return (
            <View key={p.name} style={styles.planet}>
              <View style={[styles.dot, { backgroundColor: seen ? colors.venus : 'rgba(245,243,255,0.25)' }]} />
              <Text style={[styles.planetName, !seen && styles.dim]}>{t(`planet_${p.name}`)}</Text>
              <Text style={styles.planetCon}>{con(p.constellation)}</Text>
              <Text style={[styles.planetWhere, !seen && styles.dim]}>
                {t(`planetWhere_${p.where}`, { dir: dir(p.azimuth), deg: Math.round(p.altitude) })}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={panelText.note}>{t('birthAtEvening', { time: time(sky.at) })}</Text>

      <Pressable onPress={onShare} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]} accessibilityRole="button">
        <SparkleIcon color={colors.text} size={18} />
        <Text style={styles.shareText}>{t('birthShare')}</Text>
      </Pressable>
    </Panel>
  );
}

/** The words on the share card: the moon's phase, the date, and two facts. */
function shareInfo(birth: Birth, sky: BirthSky, t: ReturnType<typeof useSettings>['t'], lang: 'zh' | 'en'): ShareCardInfo {
  const up = sky.planets.filter((p) => p.where === 'up' && sky.dark);
  return {
    eyebrow: t('birthShareEyebrow'),
    phase: t(`phase_${sky.moon.phaseName}`),
    when: birth.date.replaceAll('-', '.'),
    stats: [
      { label: t('birthMoonIn'), value: conName(sky.moon.constellation, lang) },
      { label: t('moonLit'), value: `${Math.round(sky.moon.illumination * 100)}%` },
    ],
    note: up.length
      ? t('birthPlanetsSeenEvening', { names: up.map((p) => t(`planet_${p.name}`)).join(t('birthJoin')) })
      : t('birthFullMoonsLine', { n: sky.fullMoonsSince }),
    brand: t('birthShareBrand'),
  };
}

export default function BirthScreen() {
  const { settings, update, t, lang } = useSettings();
  const { birth } = settings;
  const [choosingPlace, setChoosingPlace] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setSearch] = useState<SearchState>({ status: 'idle', results: [] });
  const [adding, setAdding] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<ComponentRef<typeof View>>(null);

  const followed = settings.cityIds.map((id) => findCity(id, settings.customCities)).filter((c): c is City => !!c);
  const place = birth?.place ?? followed[0] ?? CITIES[0];
  const sky = useMemo(() => (birth ? computeBirthSky(birth) : null), [birth]);

  // Search as you type, after a short pause, cancelling the previous request.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
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

  const sendShare = async () => {
    if (!shareRef.current) return;
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      // Closing the share sheet without picking anything lands here too; nothing to do.
    }
  };

  const save = (patch: Partial<Birth>) => update({ birth: { date: DEFAULT_DATE, place, ...birth, ...patch } });
  const choose = (city: City) => {
    save({ place: city });
    setChoosingPlace(false);
    setQuery('');
  };
  const choosePlace = async (p: Place) => {
    setAdding(p.id);
    const city = await cityFromPlace(p, lang);
    setAdding(null);
    choose(city);
  };

  // Results from an earlier, longer query are dropped once the field is nearly empty.
  const search: SearchState = query.trim().length >= 2 ? found : { status: 'idle', results: [] };
  const date = birth?.date ?? DEFAULT_DATE;
  const value = pickerValue(date);

  return (
    <View style={styles.safe}>
      <SceneBackground scene="night" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t('tabBirth')}</Text>

          <Group footer={t('birthPrivacy')}>
            <Row icon={<CalendarIcon color={colors.text} />} label={t('birthDate')}>
              <DateValue value={value} label={birth ? date : t('birthPick')} onPick={(d) => save({ date: toDateString(d) })} />
            </Row>
            <Row icon={<PinIcon color={colors.text} />} label={t('birthPlace')} onPress={() => setChoosingPlace((v) => !v)}>
              <Text style={groupStyles.value}>{place.name[lang]}</Text>
              <ChevronRightIcon color={colors.textDim} size={18} />
            </Row>
          </Group>

          {choosingPlace && (
            <>
              <View style={[groupStyles.panel, styles.searchRow]}>
                <SearchIcon color={colors.textDim} size={18} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('birthPlaceSearch')}
                  placeholderTextColor={colors.textDim}
                  style={[styles.input, lang === 'zh' && { fontFamily: CJK_FONT }]}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoFocus
                  clearButtonMode="while-editing"
                />
                {search.status === 'loading' && <ActivityIndicator color={colors.textDim} size="small" />}
              </View>
              {search.status === 'error' && <Text style={styles.note}>{t('citySearchFailed')}</Text>}
              {search.status === 'done' && !search.results.length && <Text style={styles.note}>{t('citySearchEmpty')}</Text>}
              <Group>
                {search.results.map((p) => (
                  <Row key={p.id} label={p.name} sub={placeRegion(p) || undefined} onPress={() => choosePlace(p)}>
                    {adding === p.id && <ActivityIndicator color={colors.text} size="small" />}
                  </Row>
                ))}
              </Group>
              {!query.trim() && (
                <Group title={t('birthPlaceFollowed')}>
                  {followed.map((c) => (
                    <Row key={c.id} label={c.name[lang]} onPress={() => choose(c)}>
                      {c.id === place.id && <CheckIcon color={colors.glow} size={20} />}
                    </Row>
                  ))}
                </Group>
              )}
            </>
          )}

          {birth && sky ? (
            // Keyed on the inputs so the card rises in again whenever they change.
            <Rise key={`${birth.date}-${birth.place.id}`}>
              <BirthCard birth={birth} sky={sky} onShare={() => setSharing(true)} />
            </Rise>
          ) : (
            <Text style={styles.lead}>{t('birthLead')}</Text>
          )}
        </ScrollView>
      </SafeAreaView>

      {birth && sky && (
        <Modal visible={sharing} transparent animationType="fade" onRequestClose={() => setSharing(false)}>
          <Pressable style={styles.shareBackdrop} onPress={() => setSharing(false)}>
            {/* Taps on the card itself shouldn't close the preview. */}
            <Pressable onPress={() => {}}>
              <BirthShareCard ref={shareRef} illumination={sky.moon.illumination} waxing={sky.moon.waxing} {...shareInfo(birth, sky, t, lang)} />
            </Pressable>
            <View style={styles.shareActions}>
              <Pressable onPress={() => setSharing(false)} style={({ pressed }) => [styles.shareGhost, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={styles.shareText}>{t('close')}</Text>
              </Pressable>
              <Pressable onPress={sendShare} style={({ pressed }) => [styles.shareSend, pressed && styles.pressed]} accessibilityRole="button">
                <Text style={[styles.shareText, styles.shareSendText]}>{t('birthShareSend')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: 120 },
  title: { ...type.largeTitle, fontSize: 26, color: colors.text, marginTop: spacing.sm },
  lead: { ...type.body, color: colors.textDim, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md + 2, minHeight: 52 },
  input: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: 10 },
  note: { ...type.caption, color: colors.textDim, paddingHorizontal: spacing.sm },
  card: { gap: spacing.md, paddingVertical: spacing.lg - 4 },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  heroText: { alignItems: 'center' },
  phase: { ...type.title, fontSize: 24, color: colors.text },
  center: { textAlign: 'center' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  shareText: { ...type.headline, color: colors.text },
  pressed: { opacity: 0.7 },
  shareBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: 'rgba(3,4,12,0.88)' },
  shareActions: { flexDirection: 'row', gap: spacing.md },
  shareGhost: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)' },
  shareSend: { paddingHorizontal: 36, paddingVertical: 12, borderRadius: 22, backgroundColor: colors.glow },
  shareSendText: { color: '#1A0E08' },
  planets: { gap: 10 },
  planet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  planetName: { fontSize: 15, fontWeight: '500', color: colors.text, width: 52 },
  planetCon: { ...type.caption, color: colors.textDim, flex: 1 },
  planetWhere: { ...type.caption, color: colors.text, fontVariant: ['tabular-nums'] },
  dim: { color: colors.textDim },
});
