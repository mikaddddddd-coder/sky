import type { Lang } from '../lib/i18n/strings';

export type City = {
  id: string;
  name: { zh: string; en: string };
  latitude: number;
  longitude: number;
  timezone: string;
  /** Where the city came from: the built-in list, a search, or the device location. */
  source?: 'search' | 'here';
  /** Region and country, shown under the name for searched places. */
  region?: string;
};

/** Id of the city that follows the device location. */
export const HERE_ID = 'here';

export const CITIES: City[] = [
  { id: 'shanghai', name: { zh: '上海', en: 'Shanghai' }, latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
  { id: 'tokyo', name: { zh: '东京', en: 'Tokyo' }, latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'chengdu', name: { zh: '成都', en: 'Chengdu' }, latitude: 30.5728, longitude: 104.0668, timezone: 'Asia/Shanghai' },
  { id: 'beijing', name: { zh: '北京', en: 'Beijing' }, latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
  { id: 'hongkong', name: { zh: '香港', en: 'Hong Kong' }, latitude: 22.3193, longitude: 114.1694, timezone: 'Asia/Hong_Kong' },
  { id: 'osaka', name: { zh: '大阪', en: 'Osaka' }, latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo' },
  { id: 'london', name: { zh: '伦敦', en: 'London' }, latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
  { id: 'newyork', name: { zh: '纽约', en: 'New York' }, latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  { id: 'paris', name: { zh: '巴黎', en: 'Paris' }, latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
  { id: 'sydney', name: { zh: '悉尼', en: 'Sydney' }, latitude: -33.8688, longitude: 151.2093, timezone: 'Australia/Sydney' },
  { id: 'losangeles', name: { zh: '洛杉矶', en: 'Los Angeles' }, latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
];

// The cities offered in the Cities tab, in the order shown: the phone's language decides which
// part of the world comes first, and the first three are what a new install follows.
const SUGGESTED: Record<Lang, string[]> = {
  zh: ['shanghai', 'tokyo', 'chengdu', 'beijing', 'hongkong', 'osaka'],
  en: ['london', 'newyork', 'tokyo', 'paris', 'sydney', 'losangeles'],
};

export const suggestedCities = (lang: Lang): City[] => SUGGESTED[lang].map((id) => CITIES.find((c) => c.id === id)!);
/** The built-in list for the Cities tab: the suggestions, after any built-in city already followed from the other list. */
export const builtInCityList = (lang: Lang, followed: string[]): City[] => [
  ...CITIES.filter((c) => followed.includes(c.id) && !SUGGESTED[lang].includes(c.id)),
  ...suggestedCities(lang),
];
export const defaultCityIds = (lang: Lang): string[] => SUGGESTED[lang].slice(0, 3);

export function findCity(id: string, saved: City[] = []): City | undefined {
  return CITIES.find((c) => c.id === id) ?? saved.find((c) => c.id === id);
}
