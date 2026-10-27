import type { Lang, StringKey } from './i18n/strings';

export function formatTime(date: Date, timezone: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** String key for the nearest of eight compass points to an azimuth. */
export const dirKey = (az: number) => `dir_${DIRS[Math.round((((az % 360) + 360) % 360) / 45) % 8]}` as StringKey;
