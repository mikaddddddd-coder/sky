// Finding places: city search through Open-Meteo's free geocoder (no key),
// and the device's own position through expo-location.
import { getCalendars } from 'expo-localization';
import * as Location from 'expo-location';
import { HERE_ID, type City } from '../constants/cities';
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
};

export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const url = `${GEOCODER}/search?name=${encodeURIComponent(query)}&count=8&language=${lang}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding ${res.status}`);
  const json = (await res.json()) as { results?: Place[] };
  return (json.results ?? []).filter((p) => p.timezone);
}

export const placeRegion = (p: Place) => [p.admin1, p.country].filter((s) => s && s !== p.name).join(' · ');

/** Turns a search result into a city, looking up its name in the other language too. */
export async function cityFromPlace(place: Place, lang: Lang): Promise<City> {
  const other: Lang = lang === 'zh' ? 'en' : 'zh';
  let otherName = place.name;
  try {
    const res = await fetch(`${GEOCODER}/get?id=${place.id}&language=${other}`);
    if (res.ok) otherName = ((await res.json()) as Place).name ?? place.name;
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
        name: { zh: name, en: name },
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
