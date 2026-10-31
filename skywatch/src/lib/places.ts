// Finding places: city search through Open-Meteo's free geocoder (no key),
// and the device's own position through expo-location.
import { getCalendars } from 'expo-localization';
import * as Location from 'expo-location';
import { HERE_ID, type City } from '../constants/cities';
import { toSimplified, toTraditional } from './i18n/hanzi';
import type { Lang } from './i18n/strings';

const GEOCODER = 'https://geocoding-api.open-meteo.com/v1';

export type Place = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
  population?: number;
};

async function fetchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const url = `${GEOCODER}/search?name=${encodeURIComponent(query)}&count=8&language=${lang}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding ${res.status}`);
  const json = (await res.json()) as { results?: Place[] };
  return (json.results ?? []).filter((p) => p.timezone);
}

const simplify = (p: Place): Place => ({
  ...p,
  name: toSimplified(p.name),
  admin1: p.admin1 && toSimplified(p.admin1),
  country: p.country && toSimplified(p.country),
});

/**
 * The geocoder matches names literally, and holds many cities abroad only in
 * traditional characters (纽约 finds nothing, 紐約 finds New York). So a Chinese
 * query is also tried in the other script, the biggest places come first, and
 * names are shown simplified.
 */
export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  if (lang !== 'zh') return fetchPlaces(query, lang, signal);
  const queries = [...new Set([query, toTraditional(query), toSimplified(query)])];
  if (queries.length === 1) return (await fetchPlaces(query, lang, signal)).map(simplify);
  const seen = new Set<number>();
  return (await Promise.all(queries.map((q) => fetchPlaces(q, lang, signal))))
    .flat()
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, 8)
    .map(simplify);
}

export const placeRegion = (p: Place) => [p.admin1, p.country].filter((s) => s && s !== p.name).join(' · ');

/** Turns a search result into a city, looking up its name in the other language too. */
export async function cityFromPlace(place: Place, lang: Lang): Promise<City> {
  const other: Lang = lang === 'zh' ? 'en' : 'zh';
  let otherName = place.name;
  try {
    const res = await fetch(`${GEOCODER}/get?id=${place.id}&language=${other}`);
    if (res.ok) otherName = ((await res.json()) as Place).name ?? place.name;
    if (other === 'zh') otherName = toSimplified(otherName);
  } catch {
    // Fall back to the same name in both languages.
  }
  return {
    id: `place-${place.id}`,
    name: lang === 'zh' ? { zh: place.name, en: otherName } : { zh: otherName, en: place.name },
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    source: 'search',
    region: placeRegion(place),
  };
}

export type LocateResult = { city: City } | { error: 'denied' | 'failed' };

/**
 * The city at the device's position. With `ask` false it never shows the
 * permission prompt, so it can run quietly on launch.
 */
export async function locateHere(ask = true): Promise<LocateResult> {
  try {
    const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { error: 'denied' };
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = pos.coords;
    const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
    const name = addr?.city ?? addr?.subregion ?? addr?.region ?? addr?.name ?? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    const timezone = addr?.timezone ?? getCalendars()[0]?.timeZone ?? 'UTC';
    return {
      city: {
        id: HERE_ID,
        name: { zh: toSimplified(name), en: name },
        latitude,
        longitude,
        timezone,
        source: 'here',
        region: [addr?.region, addr?.country].filter((s) => s && s !== name).join(' · '),
      },
    };
  } catch {
    return { error: 'failed' };
  }
}
