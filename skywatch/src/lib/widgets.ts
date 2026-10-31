// Feeds the home screen widget and the Dynamic Island countdown from each forecast.
// Runs wherever the forecast refreshes: on opening the app, and in the background
// refresh (see background.ts). Neither exists in Expo Go or on web, so both are skipped there.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { MoonActivityProps } from '../widgets/MoonActivity';
import type { GlowTone, SunsetActivityProps } from '../widgets/SunsetActivity';
import type { GlowSlot, TonightWidgetProps, WeekBar } from '../widgets/TonightWidget';
import { fetchNightWeather } from './api/openMeteo';
import { formatTime } from './format';
import type { Lang, StringKey } from './i18n/strings';
import { glowWorthAlert } from './notifications';
import type { Settings } from './settings';
import type { CityReport, GlowKind, TonightReport } from './sky/report';
import { clarityAt, moonViewTime } from './sky/moonClarity';
import type { GlowForecast } from './sky/sunsetGlow';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

const available = Platform.OS === 'ios' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// Loaded only where the native module exists; requiring them in Expo Go would throw.
const tonightWidget = () => (require('../widgets/TonightWidget') as typeof import('../widgets/TonightWidget')).default;
const sunsetActivity = () => (require('../widgets/SunsetActivity') as typeof import('../widgets/SunsetActivity')).default;
const moonActivity = () => (require('../widgets/MoonActivity') as typeof import('../widgets/MoonActivity')).default;
const widgetsDir = () => (require('expo-widgets') as typeof import('expo-widgets')).widgetsDirectory;

// Same hand-off points as the Tonight card: the evening light is over 45 min after sunset, the morning's 30 min after sunrise.
const DUSK_OVER_MS = 45 * 60_000;
const DAWN_OVER_MS = 30 * 60_000;
const DAY = 24 * 3600_000;

/** The calendar day of `date` in the city's time zone, for "tonight" against "tomorrow". */
const localDay = (date: Date | number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);

/** Which sky the cards are painted in: a 火烧云, a likely 晚霞, a faint one, or a quiet evening. */
function toneOf(g: GlowForecast): GlowTone {
  if (g.fire) return 'fire';
  return g.level === 'excellent' || g.level === 'good' ? 'glow' : g.level === 'fair' ? 'soft' : 'quiet';
}

/** The card's one line: "今晚可能有火烧云", "明早有望看到朝霞", or the Tonight card's quieter read. */
function headlineFor(g: GlowForecast, kind: GlowKind, sameDay: boolean, t: T) {
  const when = t(kind === 'dusk' ? (sameDay ? 'widgetTonight' : 'widgetTomorrowEvening') : sameDay ? 'widgetThisMorning' : 'widgetTomorrowMorning');
  const tone = toneOf(g);
  if (tone === 'fire') return t('widgetHeadFire', { when });
  if (tone === 'glow') return t(kind === 'dusk' ? 'widgetHeadGlowDusk' : 'widgetHeadGlowDawn', { when });
  return t(kind === 'dusk' ? `glowLevel_${g.level}` : `dawnLevel_${g.level}`);
}

/** The widget's two slots as they should read at `at`: the next sunset glow and the next sunrise glow. */
function slotsAt(r: CityReport, at: number, lang: Lang, t: T): Pick<TonightWidgetProps, 'dusk' | 'dawn' | 'week'> {
  const out: { dusk?: GlowSlot; dawn?: GlowSlot; week?: WeekBar[] } = {};
  const tz = r.city.timezone;
  const week = r.week ?? [];
  const di = week.findIndex((d) => d.sunset.getTime() + DUSK_OVER_MS > at);
  const ai = week.findIndex((d) => d.sunrise.getTime() + DAWN_OVER_MS > at);
  const dusk = di >= 0 ? week[di].dusk : null;
  const dawn = ai >= 0 ? week[ai].dawn : null;
  if (dusk) {
    const sameDay = localDay(week[di].sunset, tz) === localDay(at, tz);
    out.dusk = {
      headline: headlineFor(dusk, 'dusk', sameDay, t),
      short: dusk.fire ? t('fireTitle') : t(sameDay ? 'widgetDusk' : 'widgetDuskTomorrow'),
      pct: dusk.score,
      timeLabel: t('widgetSunset'),
      time: formatTime(week[di].sunset, tz, lang),
      tone: toneOf(dusk),
    };
    // The bars start at the evening shown, one letter per day in the city's own calendar.
    const weekday = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: tz, weekday: 'narrow' });
    out.week = week.slice(di).map((d) => ({ pct: d.dusk?.score ?? 0, day: weekday.format(d.sunset), fire: !!d.dusk?.fire }));
  }
  if (dawn) {
    const sameDay = localDay(week[ai].sunrise, tz) === localDay(at, tz);
    out.dawn = {
      headline: headlineFor(dawn, 'dawn', sameDay, t),
      short: t(sameDay ? 'widgetDawn' : 'widgetDawnTomorrow'),
      pct: dawn.score,
      timeLabel: t('widgetSunrise'),
      time: formatTime(week[ai].sunrise, tz, lang),
      tone: toneOf(dawn),
    };
  }
  return out;
}

function syncWidget(report: TonightReport, lang: Lang, t: T) {
  const r = report.cities.find((c) => !c.error) ?? report.cities[0];
  const base = { city: r ? r.city.name[lang] : t('appName'), empty: t('widgetEmpty') };
  if (!r?.week?.length) {
    tonightWidget().updateSnapshot(base);
    return;
  }
  // The widget cannot forecast on its own, so the app hands it what to show now and at each
  // hand-off over the next day and a half, from the week the forecast already holds.
  const now = Date.now();
  const turns = r.week
    .flatMap((d) => [d.sunset.getTime() + DUSK_OVER_MS, d.sunrise.getTime() + DAWN_OVER_MS])
    .filter((at) => at > now && at < now + 1.5 * DAY)
    .sort((a, b) => a - b);
  tonightWidget().updateTimeline([now, ...turns].map((at) => ({ date: new Date(at), props: { ...base, ...slotsAt(r, at, lang, t) } })));
}

// --- Dynamic Island ----------------------------------------------------------

// The sunset card starts once the app is open within this long of a sunset worth going out for.
const ISLAND_LEAD_MS = 4 * 3600_000;
// It stays a little past sunset, through the reddest minutes.
const ISLAND_AFTER_MS = 30 * 60_000;
// The moon card shows from a few hours before a clear full moon rises until it is well up.
const MOON_LEAD_MS = 4 * 3600_000;
const MOON_AFTER_MS = 2 * 3600_000;
// Clear enough to be worth a card; anything hazier is left to the app.
const MOON_CLEAR = new Set(['clear', 'fair']);
const ISLAND_KEY = 'skywatch.island.v2';
type IslandRecord = { id: string; key: string; from: number };

/** The moon photo, copied once into the folder the widget extension can read. */
async function moonPhoto(): Promise<string> {
  const dir = widgetsDir();
  if (!dir) return '';
  const dest = new File(dir, 'moon.jpg');
  if (!dest.exists) {
    const asset = await Asset.fromModule(require('../../assets/moon.jpg')).downloadAsync();
    if (!asset.localUri) return '';
    new File(asset.localUri).copy(dest);
  }
  return dest.uri;
}

/** What the island should show now: a sunset worth going out for first, else a clear full moon rising. */
async function islandWanted(report: TonightReport, settings: Settings, lang: Lang, t: T, saved: IslandRecord | null) {
  if (settings.alerts.island === false) return null;
  const now = Date.now();

  if (settings.alerts.glow) {
    const pick = report.cities.find((r) => {
      const until = r.glowSunset.getTime() - now;
      // A card already running stays through the minutes after sunset; a new one only starts before it.
      const after = saved?.key === `glow:${r.city.id}:${r.glowSunset.toISOString()}` ? -ISLAND_AFTER_MS : 0;
      return !r.error && !r.glowTomorrow && until > after && until <= ISLAND_LEAD_MS && glowWorthAlert(r.glow, settings);
    });
    if (pick) {
      const g = pick.glow!;
      const sunsetAt = pick.glowSunset.getTime();
      const props: SunsetActivityProps = {
        headline: headlineFor(g, 'dusk', true, t),
        pct: g.score,
        tone: toneOf(g),
        from: now,
        sunsetAt,
        sunsetLabel: t('widgetSunset'),
        sunsetTime: formatTime(pick.glowSunset, pick.city.timezone, lang),
      };
      return {
        kind: 'glow' as const,
        key: `glow:${pick.city.id}:${pick.glowSunset.toISOString()}`,
        props,
        staleAt: new Date(sunsetAt + ISLAND_AFTER_MS),
        url: `skywatch://glow?city=${encodeURIComponent(pick.city.id)}&kind=dusk`,
      };
    }
  }

  if (settings.alerts.sky) {
    for (const r of report.cities) {
      const { moon, sun } = r.sky;
      const rise = moon.moonrise?.getTime();
      if (r.error || moon.phaseName !== 'full' || !rise || rise - now > MOON_LEAD_MS || now - rise > MOON_AFTER_MS) continue;
      const weather = await fetchNightWeather(r.city.latitude, r.city.longitude).catch(() => null);
      const clarity = weather ? clarityAt(weather, moonViewTime(sun.sunset, moon.moonrise)) : null;
      if (!clarity || !MOON_CLEAR.has(clarity.level)) continue;
      const props: MoonActivityProps = {
        title: `${t('phase_full')} · ${t(`clarity_${clarity.level}`)}`,
        time: formatTime(moon.moonrise!, r.city.timezone, lang),
        photo: await moonPhoto().catch(() => ''),
      };
      return {
        kind: 'moon' as const,
        key: `moon:${r.city.id}:${moon.moonrise!.toISOString()}`,
        props,
        staleAt: new Date(rise + MOON_AFTER_MS),
        url: `skywatch://moon?city=${encodeURIComponent(r.city.id)}`,
      };
    }
  }
  return null;
}

async function syncIsland(report: TonightReport, settings: Settings, lang: Lang, t: T, canStart: boolean) {
  const Sunset = sunsetActivity();
  const Moon = moonActivity();
  const saved: IslandRecord | null = JSON.parse((await AsyncStorage.getItem(ISLAND_KEY)) ?? 'null');
  const want = await islandWanted(report, settings, lang, t, saved);
  const running = [...Sunset.getInstances(), ...Moon.getInstances()];
  const current = saved && want && saved.key === want.key ? running.find((a) => a.getId() === saved.id) : undefined;

  // Anything else running is from another evening or city, or was switched off. One that a new
  // card replaces goes at once; one that simply ran its course may linger on the Lock Screen.
  for (const a of running) if (a !== current) await a.end(want ? 'immediate' : 'default').catch(() => {});
  if (!want) {
    if (saved) await AsyncStorage.removeItem(ISLAND_KEY);
    return;
  }
  if (current) {
    // Keep the countdown counting from when it started rather than restarting it on every refresh.
    const props = want.kind === 'glow' ? { ...want.props, from: saved!.from } : want.props;
    await (current as { update: (p: object, stale?: Date) => Promise<void> }).update(props, want.staleAt).catch(() => {});
    return;
  }
  // iOS only lets an app start a Live Activity while it is in the foreground.
  if (!canStart) return;
  const started = want.kind === 'glow' ? Sunset.start(want.props, want.url, want.staleAt) : Moon.start(want.props, want.url, want.staleAt);
  await AsyncStorage.setItem(ISLAND_KEY, JSON.stringify({ id: started.getId(), key: want.key, from: Date.now() } satisfies IslandRecord));
}

/** Brings the widget and the Dynamic Island countdown up to date with this forecast. */
export async function syncWidgets(report: TonightReport, settings: Settings, lang: Lang, t: T, { foreground }: { foreground: boolean }) {
  if (!available) return;
  try {
    syncWidget(report, lang, t);
  } catch (e) {
    // A build without the widget extension: nothing to update.
    if (__DEV__) console.warn('widget sync failed', e);
  }
  try {
    await syncIsland(report, settings, lang, t, foreground);
  } catch (e) {
    // Live Activities turned off in iOS Settings, or not supported on this device.
    if (__DEV__) console.warn('Dynamic Island sync failed', e);
  }
}
