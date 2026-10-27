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
const NOTIFIED_TYPHOONS_KEY = 'skywatch.notifiedTyphoons';

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

export async function scheduleTonightAlerts(report: TonightReport, settings: Settings, lang: Lang, t: T) {
  if (!(await ensureNotificationPermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  // Typhoon alerts fire immediately, so remember which ones were sent to avoid repeats on every refresh.
  const notified = new Set<string>(JSON.parse((await AsyncStorage.getItem(NOTIFIED_TYPHOONS_KEY)) ?? '[]'));

  const at = async (date: Date, title: string, body: string) => {
    const fireAt = Math.max(date.getTime(), now + 5_000);
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  };

  for (const r of report.cities) {
    const city = r.city.name[lang];
    const sunset = r.sky.sun.sunset;

    const beforeSunset = sunset.getTime() > now;
    if (beforeSunset && settings.alerts.glow && r.glow && r.glow.score >= GLOW_THRESHOLD) {
      await at(
        new Date(sunset.getTime() - 2 * 3600_000),
        t('notifGlowTitle', { city }),
        t('notifGlowBody', { pct: r.glow.score, time: formatTime(sunset, r.city.timezone, lang) }),
      );
    }

    const best = [
      r.sky.moon.score >= SKY_THRESHOLD ? t(`moon_highlight_${r.sky.moon.highlight}`) : null,
      r.sky.venus.score >= SKY_THRESHOLD ? t(`venus_highlight_${r.sky.venus.highlight}`) : null,
      r.sky.conjunction ? t('conjunctionDetail', { deg: r.sky.conjunction.separation.toFixed(1) }) : null,
    ].filter(Boolean);
    if (beforeSunset && settings.alerts.sky && best.length) {
      await at(new Date(sunset.getTime() - 3 * 3600_000), t('notifSkyTitle', { city }), best.join(' · '));
    }

    const typhoonKey = r.typhoon && `${r.typhoon.cyclone.id}:${r.city.id}`;
    if (settings.alerts.typhoon && r.typhoon && typhoonKey && !notified.has(typhoonKey)) {
      notified.add(typhoonKey);
      await at(
        new Date(now),
        t('notifTyphoonTitle', { name: r.typhoon.cyclone.name, city }),
        t('notifTyphoonBody', { km: Math.round(r.typhoon.km) }),
      );
    }
  }
  await AsyncStorage.setItem(NOTIFIED_TYPHOONS_KEY, JSON.stringify([...notified]));
}
