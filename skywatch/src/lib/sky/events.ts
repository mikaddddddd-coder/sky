// Special sky events. For now these are the year's main meteor showers, whose peaks
// fall on about the same dates every year; eclipses, the moon passing a planet and
// the like can join later as other kinds.
import type { Lang, StringKey } from '../i18n/strings';
import { tzOffsetMinutes } from './report';

type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export type SkyEventKind = 'meteor';
export type SkyEventId = 'quadrantids' | 'lyrids' | 'etaAquariids' | 'perseids' | 'orionids' | 'leonids' | 'geminids';

export type SkyEvent = {
  id: SkyEventId;
  kind: SkyEventKind;
  /** The peak, as a local calendar date. */
  month: number;
  day: number;
  /** Meteors an hour at the peak under ideal skies (ZHR). */
  zhr: number;
};

const SHOWERS: SkyEvent[] = [
  { id: 'quadrantids', kind: 'meteor', month: 1, day: 3, zhr: 80 },
  { id: 'lyrids', kind: 'meteor', month: 4, day: 22, zhr: 18 },
  { id: 'etaAquariids', kind: 'meteor', month: 5, day: 6, zhr: 50 },
  { id: 'perseids', kind: 'meteor', month: 8, day: 12, zhr: 100 },
  { id: 'orionids', kind: 'meteor', month: 10, day: 21, zhr: 20 },
  { id: 'leonids', kind: 'meteor', month: 11, day: 17, zhr: 15 },
  { id: 'geminids', kind: 'meteor', month: 12, day: 14, zhr: 150 },
];

export type UpcomingEvent = SkyEvent & {
  /** Noon UTC on the peak's local date, for formatting the day. */
  date: Date;
  /** Whole days from today in the city, 0 when the peak is tonight. */
  daysAway: number;
};

/** The next events from today on, in the given city's calendar. */
export function upcomingEvents(timezone: string, now = new Date(), count = SHOWERS.length): UpcomingEvent[] {
  const local = new Date(now.getTime() + tzOffsetMinutes(timezone, now) * 60_000);
  const year = local.getUTCFullYear();
  const today = Date.UTC(year, local.getUTCMonth(), local.getUTCDate());
  return [year, year + 1]
    .flatMap((y) => SHOWERS.map((e) => ({ ...e, at: Date.UTC(y, e.month - 1, e.day) })))
    .filter((e) => e.at >= today)
    .sort((a, b) => a.at - b.at)
    .slice(0, count)
    .map(({ at, ...e }) => ({ ...e, date: new Date(at + 12 * 3600_000), daysAway: Math.round((at - today) / 86_400_000) }));
}

/** The peak's day, e.g. 8月12日 / Aug 12. */
export function eventDay(e: UpcomingEvent, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(e.date);
}

/** When the peak is, said the way you'd plan for it: tonight, tomorrow night, or a date and a countdown. */
export function peakLine(e: UpcomingEvent, t: Translate, lang: Lang) {
  if (e.daysAway === 0) return t('eventsPeakTonight');
  if (e.daysAway === 1) return t('eventsPeakTomorrow');
  return t('eventsPeak', { date: eventDay(e, lang), n: e.daysAway });
}
