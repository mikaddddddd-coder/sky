import { fetchActiveCyclones, nearestCyclone, type Cyclone, type CycloneNear } from '../api/typhoon';
import { fetchCanvasClouds, fetchPointForecasts, type PointForecast } from '../api/openMeteo';
import { destinationPoint } from '../geo';
import type { City } from '../../constants/cities';
import { computeEveningSky, type EveningSky } from './astro';
import { glowFromForecasts, RAY_KM, type GlowForecast } from './sunsetGlow';

// How far toward the sunset we sample low clouds; the sun lights the clouds
// above you through roughly this much atmosphere.
const WEST_SAMPLE_KM = 150;
export const TYPHOON_ALERT_KM = 800;
// Once the evening light is well over, the glow worth knowing about is tomorrow's.
const GLOW_OVER_MS = 45 * 60_000;
const DAY_MS = 24 * 3600_000;

export type CityReport = {
  city: City;
  sky: EveningSky;
  glow: GlowForecast | null;
  /** The sunset the glow forecast is for: tonight's, or tomorrow's once tonight's light has gone. */
  glowSunset: Date;
  glowTomorrow: boolean;
  /** Temperature and humidity range over the city's local calendar day. */
  today: DayRange | null;
  /** Nearest cyclone within alert range, if any. */
  typhoon: CycloneNear | null;
  /** Nearest active West Pacific cyclone at any distance. */
  nearestCyclone: CycloneNear | null;
  error?: string;
};

export type DayRange = { tempMin: number; tempMax: number; humidityMin: number; humidityMax: number };

/** Min/max of the hourly forecast within the local day that contains `now`. */
function dayRange(f: PointForecast, now: Date, offsetMinutes: number): DayRange | null {
  const offset = offsetMinutes * 60_000;
  const start = Math.floor((now.getTime() + offset) / 86_400_000) * 86_400_000 - offset;
  const temps: number[] = [];
  const hums: number[] = [];
  f.time.forEach((t, i) => {
    if (t < start || t >= start + 86_400_000) return;
    if (Number.isFinite(f.temperature[i])) temps.push(f.temperature[i]);
    if (Number.isFinite(f.humidity[i])) hums.push(f.humidity[i]);
  });
  if (!temps.length || !hums.length) return null;
  return { tempMin: Math.min(...temps), tempMax: Math.max(...temps), humidityMin: Math.min(...hums), humidityMax: Math.max(...hums) };
}

export type TonightReport = {
  generatedAt: Date;
  cities: CityReport[];
  activeCyclones: Cyclone[];
};

export function tzOffsetMinutes(timezone: string, at: Date) {
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

  const glowSuns = cities.map((c, i) => {
    if (now.getTime() < skies[i].sun.civilDusk.getTime() + GLOW_OVER_MS) return { sun: skies[i].sun, tomorrow: false };
    const tomorrow = new Date(now.getTime() + DAY_MS);
    return { sun: computeEveningSky(c.latitude, c.longitude, tomorrow, tzOffsetMinutes(c.timezone, tomorrow)).sun, tomorrow: true };
  });

  const points = cities.flatMap((c, i) => [
    { latitude: c.latitude, longitude: c.longitude },
    destinationPoint(c.latitude, c.longitude, glowSuns[i].sun.sunsetAzimuth, WEST_SAMPLE_KM),
  ]);

  // Clouds out along each city's sunset direction, for how vivid the glow would be.
  const rayPoints = cities.flatMap((c, i) => RAY_KM.map((km) => destinationPoint(c.latitude, c.longitude, glowSuns[i].sun.sunsetAzimuth, km)));

  const [forecasts, rays, cyclones] = await Promise.all([
    fetchPointForecasts(points).catch((e: Error) => e),
    fetchCanvasClouds(rayPoints).catch(() => null),
    fetchActiveCyclones(now).catch(() => [] as Cyclone[]),
  ]);

  const reports = cities.map((city, i): CityReport => {
    const sky = skies[i];
    const near = nearestCyclone(cyclones, city.latitude, city.longitude);
    const typhoon = near && near.km <= TYPHOON_ALERT_KM ? near : null;
    const { sun: glowSun, tomorrow: glowTomorrow } = glowSuns[i];
    const base = { city, sky, typhoon, nearestCyclone: near, glowSunset: glowSun.sunset, glowTomorrow };
    if (forecasts instanceof Error) return { ...base, glow: null, today: null, error: forecasts.message };
    return {
      ...base,
      glow: glowFromForecasts(forecasts[i * 2], forecasts[i * 2 + 1], glowSun.sunset, rays && rays.slice(i * RAY_KM.length, (i + 1) * RAY_KM.length)),
      today: dayRange(forecasts[i * 2], now, tzOffsetMinutes(city.timezone, now)),
    };
  });

  return { generatedAt: now, cities: reports, activeCyclones: cyclones };
}
