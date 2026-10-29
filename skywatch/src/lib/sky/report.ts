import { fetchActiveCyclones, nearestCyclone, type Cyclone, type CycloneNear } from '../api/typhoon';
import type { FetchOptions } from '../api/http';
import { fetchCanvasClouds, fetchPointForecasts, type PointForecast } from '../api/openMeteo';
import { destinationPoint } from '../geo';
import type { City } from '../../constants/cities';
import { computeEveningSky, type EveningSky } from './astro';
import { glowFromForecasts, RAY_KM, type GlowForecast } from './sunsetGlow';

// How far toward the sunset we sample low clouds; the sun lights the clouds
// above you through roughly this much atmosphere.
const WEST_SAMPLE_KM = 150;
// That point is one of the ray's, so it comes with the ray rather than in a request of its own.
const SAMPLE_INDEX = RAY_KM.indexOf(WEST_SAMPLE_KM);
export const TYPHOON_ALERT_KM = 800;
// Once the evening light is well over, the glow worth knowing about is tomorrow's.
const GLOW_OVER_MS = 45 * 60_000;
// Morning colour fades faster once the sun is up.
const DAWN_OVER_MS = 30 * 60_000;
const DAY_MS = 24 * 3600_000;
export const WEEK_DAYS = 7;

export type GlowKind = 'dawn' | 'dusk';

/** One local day of the outlook: its sunrise glow (朝霞) and sunset glow (晚霞). */
export type GlowDay = { sunrise: Date; sunset: Date; dawn: GlowForecast | null; dusk: GlowForecast | null };

export type CityReport = {
  city: City;
  sky: EveningSky;
  glow: GlowForecast | null;
  /** The sunset the glow forecast is for: tonight's, or tomorrow's once tonight's light has gone. */
  glowSunset: Date;
  glowTomorrow: boolean;
  /** Today and the six days after it, in the city's local days. */
  week: GlowDay[];
  /** The first day in `week` whose sunrise glow, and whose sunset glow, is still to come. */
  dawnIndex: number;
  duskIndex: number;
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

export async function buildTonightReport(cities: City[], now = new Date(), opts: FetchOptions = {}): Promise<TonightReport> {
  const skies = cities.map((c) => computeEveningSky(c.latitude, c.longitude, now, tzOffsetMinutes(c.timezone, now)));
  // Sun times for each of the next seven local days.
  const weeks = cities.map((c, i) =>
    Array.from({ length: WEEK_DAYS }, (_, d) => {
      const day = new Date(now.getTime() + d * DAY_MS);
      return d === 0 ? skies[i].sun : computeEveningSky(c.latitude, c.longitude, day, tzOffsetMinutes(c.timezone, day)).sun;
    }),
  );
  const duskIndex = weeks.map((w) => Math.max(0, w.findIndex((s) => now.getTime() < s.civilDusk.getTime() + GLOW_OVER_MS)));
  const dawnIndex = weeks.map((w) => Math.max(0, w.findIndex((s) => now.getTime() < s.sunrise.getTime() + DAWN_OVER_MS)));

  // Each ray points where the sun actually sets, and rises, on the next glow to come. It moves
  // under half a degree a day, so over the week the far end drifts by less than a model grid
  // cell; one bearing each serves every day, and the days that matter most get theirs exact.
  const bearings = cities.map((_, i) => ({ west: weeks[i][duskIndex[i]].sunsetAzimuth, east: weeks[i][dawnIndex[i]].sunriseAzimuth }));

  // The full forecast is only for the city itself; out along the rays only the cloud layers matter.
  const points = cities.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
  const rayPoints = cities.map((c, i) =>
    [bearings[i].west, bearings[i].east].flatMap((az) => RAY_KM.map((km) => destinationPoint(c.latitude, c.longitude, az, km))),
  );

  const [forecasts, rays, cyclones] = await Promise.all([
    fetchPointForecasts(points, opts).catch((e: Error) => e),
    // One request per city, side by side: all of them in one took up to half a minute and
    // timed out, and this way a slow city only loses its own rays.
    Promise.all(rayPoints.map((p) => fetchCanvasClouds(p, opts).catch(() => null))),
    fetchActiveCyclones(now, opts).catch(() => [] as Cyclone[]),
  ]);

  const reports = cities.map((city, i): CityReport => {
    const sky = skies[i];
    const near = nearestCyclone(cyclones, city.latitude, city.longitude);
    const typhoon = near && near.km <= TYPHOON_ALERT_KM ? near : null;
    const n = RAY_KM.length;
    const westRay = rays[i]?.slice(0, n) ?? null;
    const eastRay = rays[i]?.slice(n) ?? null;
    const west = westRay?.[SAMPLE_INDEX] ?? null;
    const east = eastRay?.[SAMPLE_INDEX] ?? null;
    const failed = forecasts instanceof Error;
    const local = failed ? null : forecasts[i];
    const week: GlowDay[] = weeks[i].map((s, d) => ({
      sunrise: s.sunrise,
      sunset: s.sunset,
      dawn: local ? glowFromForecasts(local, east, s.sunrise, eastRay, d) : null,
      dusk: local ? glowFromForecasts(local, west, s.sunset, westRay, d) : null,
    }));
    const today = week[duskIndex[i]];
    const base = {
      city,
      sky,
      typhoon,
      nearestCyclone: near,
      glowSunset: today.sunset,
      glowTomorrow: duskIndex[i] > 0,
      week,
      dawnIndex: dawnIndex[i],
      duskIndex: duskIndex[i],
    };
    if (!local) return { ...base, glow: null, today: null, error: (forecasts as Error).message };
    return { ...base, glow: today.dusk, today: dayRange(local, now, tzOffsetMinutes(city.timezone, now)) };
  });

  return { generatedAt: now, cities: reports, activeCyclones: cyclones };
}
