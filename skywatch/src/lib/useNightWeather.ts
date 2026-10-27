import { useEffect, useState } from 'react';
import type { City } from '../constants/cities';
import { fetchNightWeather, type NightWeather } from './api/openMeteo';

// Kept for half an hour so reopening the moon scene does not refetch.
const cache = new Map<string, { at: number; data: NightWeather }>();
const TTL = 30 * 60_000;

export function useNightWeather(city: City | undefined) {
  const key = city ? `${city.latitude.toFixed(2)},${city.longitude.toFixed(2)}` : '';
  const [data, setData] = useState<NightWeather | null>(() => cache.get(key)?.data ?? null);

  useEffect(() => {
    if (!city) return;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return setData(hit.data);
    let live = true;
    fetchNightWeather(city.latitude, city.longitude)
      .then((d) => {
        cache.set(key, { at: Date.now(), data: d });
        if (live) setData(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return data;
}
