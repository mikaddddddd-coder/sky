import { fetchActiveCyclones, nearestCyclone, type Cyclone } from '../api/typhoon';
import { fetchPointForecasts } from '../api/openMeteo';
import { destinationPoint } from '../geo';
import type { City } from '../../constants/cities';
import { computeEveningSky, type EveningSky } from './astro';
import { glowFromForecasts, type GlowForecast } from './sunsetGlow';

// How far toward the sunset we sample low clouds; the sun lights the clouds
// above you through roughly this much atmosphere.
const WEST_SAMPLE_KM = 150;
export const TYPHOON_ALERT_KM = 800;

export type CityReport = {
  city: City;
  sky: EveningSky;
  glow: GlowForecast | null;
  /** Nearest cyclone within alert range, if any. */
  typhoon: { cyclone: Cyclone; km: number } | null;
  /** Nearest active West Pacific cyclone at any distance. */
  nearestCyclone: { cyclone: Cyclone; km: number } | null;
  error?: string;
};

export type TonightReport = {
  generatedAt: Date;
  cities: CityReport[];
  activeCyclones: Cyclone[];
};

function tzOffsetMinutes(timezone: string, at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - at.getTime()) / 60_000);
}

export async function buildTonightReport(cities: City[], now = new Date()): Promise<TonightReport> {
  const skies = cities.map((c) => computeEveningSky(c.latitude, c.longitude, now, tzOffsetMinutes(c.timezone, now)));

  const points = cities.flatMap((c, i) => [
    { latitude: c.latitude, longitude: c.longitude },
    destinationPoint(c.latitude, c.longitude, skies[i].sun.sunsetAzimuth, WEST_SAMPLE_KM),
  ]);

  const [forecasts, cyclones] = await Promise.all([
    fetchPointForecasts(points).catch((e: Error) => e),
    fetchActiveCyclones().catch(() => [] as Cyclone[]),
  ]);

  const reports = cities.map((city, i): CityReport => {
    const sky = skies[i];
    const near = nearestCyclone(cyclones, city.latitude, city.longitude);
    const typhoon = near && near.km <= TYPHOON_ALERT_KM ? near : null;
    const base = { city, sky, typhoon, nearestCyclone: near };
    if (forecasts instanceof Error) return { ...base, glow: null, error: forecasts.message };
    return { ...base, glow: glowFromForecasts(forecasts[i * 2], forecasts[i * 2 + 1], sky.sun.sunset) };
  });

  return { generatedAt: now, cities: reports, activeCyclones: cyclones };
}
