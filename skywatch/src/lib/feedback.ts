// "How did the sky turn out?" A little after sunset we ask about one city, and the
// answer goes to our server together with the forecast we made for that evening.
// Collected over many evenings and places, this is what the glow model gets
// calibrated against. Answers are anonymous: a random install id, no account.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { StringKey } from './i18n/strings';
import type { CityReport } from './sky/report';
import type { GlowForecast } from './sky/sunsetGlow';

export const FEEDBACK_URL = 'https://lookup.minxi.work/feedback';
export const FEEDBACK_CATEGORY = 'sky-feedback';
/** How long after sunset to ask: the colour has peaked and faded by then. */
export const ASK_AFTER_MS = 35 * 60_000;

/** 0: no colour, 1: some colour (a 晚霞), 2: it burned (a 火烧云). */
export type Rating = 0 | 1 | 2;
export const RATINGS: { value: Rating; label: StringKey }[] = [
  { value: 0, label: 'feedbackNone' },
  { value: 1, label: 'feedbackSome' },
  { value: 2, label: 'feedbackFire' },
];
const actionId = (r: Rating) => `rate-${r}`;
export const ratingFromAction = (id: string): Rating | null => {
  const m = /^rate-([012])$/.exec(id);
  return m ? (Number(m[1]) as Rating) : null;
};

// Every promising evening gets asked; of the rest, about one in three does, so the
// data also covers the evenings we said nothing would happen. `why` records which,
// so the sampling can be weighed back out when fitting the model.
const ASK_SCORE = 30;
const SAMPLE_EVERY = 3;

/** What we predicted for one city's evening, sent back with the answer. */
export type FeedbackAsk = {
  key: string; // city:date, one answer per evening
  cityId: string;
  cityName: string;
  lat: number;
  lon: number;
  sunset: string;
  /** The city's time zone, for showing the sunset time on the question page. */
  timezone?: string;
  why: 'score' | 'sample';
  forecast: Pick<GlowForecast, 'score' | 'vividness' | 'edgeKm' | 'fire' | 'leadDays' | 'reasons' | 'inputs'>;
};

function dayNumber(iso: string) {
  return Math.floor(Date.parse(iso.slice(0, 10)) / 86_400_000);
}

/** The question to ask about this city's coming sunset, or null if this evening is skipped. */
export function feedbackAskFor(r: CityReport, cityName: string): FeedbackAsk | null {
  return r.glow ? askFor(r, cityName, r.glow, r.glowSunset) : null;
}

// The Tonight page asks from a little after sunset (once the colour has had its moment)
// until late in the evening; after that the evening is left alone.
const CARD_UNTIL_MS = 6 * 3600_000;

/**
 * The question for an evening whose sunset has just passed, for the card on the Tonight page.
 * By then the forecast has rolled on to tomorrow, so the evening comes from the week.
 */
export function eveningAskFor(r: CityReport, cityName: string, now: number): FeedbackAsk | null {
  const day = r.week?.find((d) => now - d.sunset.getTime() >= ASK_AFTER_MS && now - d.sunset.getTime() < CARD_UNTIL_MS);
  return day?.dusk ? askFor(r, cityName, day.dusk, day.sunset) : null;
}

function askFor(r: CityReport, cityName: string, g: GlowForecast, sunsetAt: Date): FeedbackAsk | null {
  const sunset = sunsetAt.toISOString();
  const why = g.score >= ASK_SCORE ? 'score' : dayNumber(sunset) % SAMPLE_EVERY === 0 ? 'sample' : null;
  if (!why) return null;
  const { score, vividness, edgeKm, fire, leadDays, reasons, inputs } = g;
  return {
    key: `${r.city.id}:${sunset.slice(0, 10)}`,
    cityId: r.city.id,
    cityName,
    // About 1 km: plenty for the weather, too coarse to place someone's home.
    lat: Math.round(r.city.latitude * 100) / 100,
    lon: Math.round(r.city.longitude * 100) / 100,
    sunset,
    timezone: r.city.timezone,
    why,
    forecast: { score, vividness, edgeKm, fire, leadDays, reasons, inputs },
  };
}

/** The three answers as buttons on the notification itself; titles follow the app language. */
export async function registerFeedbackCategory(t: (key: StringKey) => string) {
  await Notifications.setNotificationCategoryAsync(
    FEEDBACK_CATEGORY,
    RATINGS.map((r) => ({ identifier: actionId(r.value), buttonTitle: t(r.label), options: { opensAppToForeground: true } })),
  );
}

const INSTALL_KEY = 'skywatch.installId';
const QUEUE_KEY = 'skywatch.feedbackQueue.v1';
const ANSWERED_KEY = 'skywatch.feedbackAnswered.v1';

async function installId(): Promise<string> {
  const saved = await AsyncStorage.getItem(INSTALL_KEY);
  if (saved) return saved;
  const id = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  await AsyncStorage.setItem(INSTALL_KEY, id);
  return id;
}

export async function isAnswered(key: string): Promise<boolean> {
  const answered: string[] = JSON.parse((await AsyncStorage.getItem(ANSWERED_KEY)) ?? '[]');
  return answered.includes(key);
}

/** Records the answer once per evening and sends it; if offline, it waits for the next try. */
export async function submitFeedback(ask: FeedbackAsk, rating: Rating, lang: string): Promise<void> {
  const answered: string[] = JSON.parse((await AsyncStorage.getItem(ANSWERED_KEY)) ?? '[]');
  if (answered.includes(ask.key)) return;
  await AsyncStorage.setItem(ANSWERED_KEY, JSON.stringify([...answered, ask.key].slice(-60)));
  // Answered here, so the notification for the same evening has nothing left to ask.
  await withdrawNotification(ask.key).catch(() => {});
  const entry = {
    ...ask,
    rating,
    lang,
    installId: await installId(),
    appVersion: Constants.expoConfig?.version ?? null,
    answeredAt: new Date().toISOString(),
  };
  const queue: unknown[] = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, entry]));
  await flushFeedback();
}

/** Cancels the evening's question if it is still to come, and clears it if it already arrived. */
async function withdrawNotification(key: string) {
  const isThis = (data: unknown) => (data as { feedbackAsk?: FeedbackAsk } | undefined)?.feedbackAsk?.key === key;
  for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
    if (isThis(n.content.data)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
  for (const n of await Notifications.getPresentedNotificationsAsync()) {
    if (isThis(n.request.content.data)) await Notifications.dismissNotificationAsync(n.request.identifier);
  }
}

const DISMISSED_KEY = 'skywatch.feedbackDismissed.v1';

export async function isDismissed(key: string): Promise<boolean> {
  const dismissed: string[] = JSON.parse((await AsyncStorage.getItem(DISMISSED_KEY)) ?? '[]');
  return dismissed.includes(key);
}

/** Closing the card on the Tonight page leaves that evening unasked there; the notification stays. */
export async function dismissAsk(key: string) {
  const dismissed: string[] = JSON.parse((await AsyncStorage.getItem(DISMISSED_KEY)) ?? '[]');
  if (!dismissed.includes(key)) await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed, key].slice(-60)));
}

let flushing: Promise<void> | null = null;

/** Sends any answers still waiting. Safe to call often; runs one at a time. */
export function flushFeedback(): Promise<void> {
  return (flushing ??= send().finally(() => (flushing = null)));
}

async function send() {
  const queue: unknown[] = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]');
  if (!queue.length) return;
  const left: unknown[] = [];
  for (const entry of queue) {
    try {
      const res = await fetch(FEEDBACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      // A 4xx means the server will never take it; drop it rather than retry forever.
      if (res.status >= 500) left.push(entry);
    } catch {
      left.push(entry);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left.slice(-100)));
}
