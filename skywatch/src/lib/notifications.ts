// Local notification scheduling. This is the on-device fallback; a server-side
// job sending remote pushes will replace it so alerts fire even when the app
// has not been opened that day.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { formatTime } from './format';
import type { Lang, StringKey } from './i18n/strings';
import type { Settings } from './settings';
import type { TonightReport } from './sky/report';

const GLOW_THRESHOLD = 55;
const SKY_THRESHOLD = 70;
// Alerts already sent or scheduled, keyed by kind, city and evening (or cyclone),
// each with the time after which the record can be forgotten.
const SENT_KEY = 'skywatch.sentAlerts.v1';
const LEGACY_TYPHOONS_KEY = 'skywatch.notifiedTyphoons';
const DAY = 24 * 3600_000;

async function loadSent(now: number): Promise<Map<string, number>> {
  const sent = new Map<string, number>(Object.entries(JSON.parse((await AsyncStorage.getItem(SENT_KEY)) ?? '{}')));
  // Carry over typhoons recorded before evening alerts were tracked too.
  const legacy: string[] = JSON.parse((await AsyncStorage.getItem(LEGACY_TYPHOONS_KEY)) ?? '[]');
  for (const k of legacy) if (!sent.has(`typhoon:${k}`)) sent.set(`typhoon:${k}`, now + 14 * DAY);
  for (const [k, until] of sent) if (until < now) sent.delete(k);
  return sent;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

// Runs one at a time, so two quick refreshes cannot both miss the sent record.
let queue: Promise<void> = Promise.resolve();

export function scheduleTonightAlerts(report: TonightReport, settings: Settings, lang: Lang, t: T) {
  queue = queue.catch(() => {}).then(() => schedule(report, settings, lang, t));
  return queue;
}

async function schedule(report: TonightReport, settings: Settings, lang: Lang, t: T) {
  if (!(await ensureNotificationPermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  const sent = await loadSent(now);

  // Everything pending is rescheduled from scratch on each refresh. An alert
  // whose time is still ahead is simply scheduled again; one whose time has
  // passed goes out right away, but only if it was never sent before, so
  // refreshing in the last hours before sunset does not repeat it.
  const alert = async (key: string, date: Date, forgetAt: number, title: string, body: string) => {
    const due = date.getTime() <= now;
    if (due && sent.has(key)) return;
    sent.set(key, forgetAt);
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(due ? now + 5_000 : date.getTime()) },
    });
  };

  for (const r of report.cities) {
    const city = r.city.name[lang];
    const sunset = r.sky.sun.sunset;
    const evening = `${r.city.id}:${sunset.toISOString().slice(0, 10)}`;
    const forgetAt = sunset.getTime() + DAY;
    const beforeSunset = sunset.getTime() > now;

    // The glow forecast may already be for tomorrow's sunset, so it keys and times off its own.
    const glowSunset = r.glowSunset;
    if (glowSunset.getTime() > now && settings.alerts.glow && r.glow && r.glow.score >= GLOW_THRESHOLD) {
      await alert(
        `glow:${r.city.id}:${glowSunset.toISOString().slice(0, 10)}`,
        new Date(glowSunset.getTime() - 2 * 3600_000),
        glowSunset.getTime() + DAY,
        t('notifGlowTitle', { city }),
        t('notifGlowBody', { pct: r.glow.score, time: formatTime(glowSunset, r.city.timezone, lang) }),
      );
    }

    const best = [
      r.sky.moon.score >= SKY_THRESHOLD ? t(`moon_highlight_${r.sky.moon.highlight}`) : null,
      r.sky.venus.score >= SKY_THRESHOLD ? t(`venus_highlight_${r.sky.venus.highlight}`) : null,
      r.sky.conjunction ? t('conjunctionDetail', { deg: r.sky.conjunction.separation.toFixed(1) }) : null,
    ].filter(Boolean);
    if (beforeSunset && settings.alerts.sky && best.length) {
      await alert(`sky:${evening}`, new Date(sunset.getTime() - 3 * 3600_000), forgetAt, t('notifSkyTitle', { city }), best.join(' · '));
    }

    if (settings.alerts.typhoon && r.typhoon) {
      await alert(
        `typhoon:${r.typhoon.cyclone.id}:${r.city.id}`,
        new Date(now),
        now + 14 * DAY,
        t('notifTyphoonTitle', { name: r.typhoon.cyclone.name, city }),
        t('notifTyphoonBody', { km: Math.round(r.typhoon.km) }),
      );
    }
  }
  await AsyncStorage.setItem(SENT_KEY, JSON.stringify(Object.fromEntries(sent)));
  await AsyncStorage.removeItem(LEGACY_TYPHOONS_KEY);
}
