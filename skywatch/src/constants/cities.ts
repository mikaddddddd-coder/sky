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
];

export const DEFAULT_CITY_IDS = ['shanghai', 'tokyo', 'chengdu'];

export function findCity(id: string, saved: City[] = []): City | undefined {
  return CITIES.find((c) => c.id === id) ?? saved.find((c) => c.id === id);
}
