// Open-Meteo: free, no API key. https://open-meteo.com/en/docs
import { getJson, type FetchOptions } from './http';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export type HourlyWeather = {
  time: number[]; // unix ms
  cloudLow: number[];
  cloudMid: number[];
  cloudHigh: number[];
  humidity: number[];
  temperature: number[]; // °C
  visibility: number[]; // meters
  precipitation: number[]; // mm
  precipProbability: number[]; // %
};

export type PointForecast = HourlyWeather & { aod: (number | null)[] };

type ForecastResponse = {
  hourly: {
    time: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    relative_humidity_2m: number[];
    temperature_2m: number[];
    visibility: number[];
    precipitation: number[];
    precipitation_probability: number[];
  };
};

type AirResponse = { hourly: { time: number[]; aerosol_optical_depth: (number | null)[] } };

const HOURLY_VARS = [
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'relative_humidity_2m',
  'temperature_2m',
  'visibility',
  'precipitation',
  'precipitation_probability',
].join(',');


/** Fetches hourly forecasts for several points in one request each (Open-Meteo accepts comma-separated coords). */
export async function fetchPointForecasts(points: { latitude: number; longitude: number }[], opts: FetchOptions = {}): Promise<PointForecast[]> {
  const lat = points.map((p) => p.latitude.toFixed(3)).join(',');
  const lon = points.map((p) => p.longitude.toFixed(3)).join(',');
  // A week ahead (plus today) for the 7-day glow outlook. The air-quality model only
  // runs 7 days out, so the last evening simply goes without aerosols.
  const common = `latitude=${lat}&longitude=${lon}&timeformat=unixtime&past_days=1`;

  const [weather, air] = await Promise.all([
    getJson<ForecastResponse | ForecastResponse[]>(`${FORECAST_URL}?${common}&forecast_days=8&hourly=${HOURLY_VARS}`, { ...opts, timeoutMs: 30_000 }),
    // Haze only fine-tunes the score, so a slow answer is not worth waiting for; it changes
    // slowly too, so an earlier answer beats none.
    getJson<AirResponse | AirResponse[]>(`${AIR_URL}?${common}&forecast_days=7&hourly=aerosol_optical_depth`, {
      ...opts,
      timeoutMs: 12_000,
      staleOnError: true,
    }).catch(() => null),
  ]);

  const weatherList = Array.isArray(weather) ? weather : [weather];
  const airList = air === null ? [] : Array.isArray(air) ? air : [air];

  return weatherList.map((w, i) => {
    const h = w.hourly;
    const time = h.time.map((t) => t * 1000);
    const airHourly = airList[i]?.hourly;
    const aodByTime = new Map<number, number | null>();
    airHourly?.time.forEach((t, j) => aodByTime.set(t * 1000, airHourly.aerosol_optical_depth[j]));
    return {
      time,
      cloudLow: h.cloud_cover_low,
      cloudMid: h.cloud_cover_mid,
      cloudHigh: h.cloud_cover_high,
      humidity: h.relative_humidity_2m,
      temperature: h.temperature_2m,
      visibility: h.visibility,
      precipitation: h.precipitation,
      precipProbability: h.precipitation_probability,
      aod: time.map((t) => aodByTime.get(t) ?? null),
    };
  });
}

export type NightWeather = {
  time: number[]; // unix ms
  cloud: number[];
  cloudLow: number[];
  cloudMid: number[];
  cloudHigh: number[];
  visibility: number[]; // meters
  humidity: number[];
  precipProbability: number[];
};

type NightResponse = {
  hourly: {
    time: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
  };
};

/** Hourly sky conditions for one place, a few days back and a week ahead, for judging the moon. */
export async function fetchNightWeather(latitude: number, longitude: number): Promise<NightWeather> {
  const vars = 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,relative_humidity_2m,precipitation_probability';
  const url = `${FORECAST_URL}?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&timeformat=unixtime&past_days=3&forecast_days=8&hourly=${vars}`;
  const h = (await getJson<NightResponse>(url)).hourly;
  return {
    time: h.time.map((t) => t * 1000),
    cloud: h.cloud_cover,
    cloudLow: h.cloud_cover_low,
    cloudMid: h.cloud_cover_mid,
    cloudHigh: h.cloud_cover_high,
    visibility: h.visibility,
    humidity: h.relative_humidity_2m,
    precipProbability: h.precipitation_probability,
  };
}

export type CanvasClouds = { time: number[]; low: number[]; high: number[]; mid: number[] };

type CanvasResponse = { hourly: { time: number[]; cloud_cover_low: number[]; cloud_cover_high: number[]; cloud_cover_mid: number[] } };

/**
 * Cloud layers only, for many points in one request: the clouds out toward the sunset and the sunrise.
 * Low cloud is in too, so the point that checks whether the sun's way in is blocked comes from here
 * rather than from a full forecast it would mostly not use.
 */
export async function fetchCanvasClouds(points: { latitude: number; longitude: number }[], opts: FetchOptions = {}): Promise<CanvasClouds[]> {
  const lat = points.map((p) => p.latitude.toFixed(3)).join(',');
  const lon = points.map((p) => p.longitude.toFixed(3)).join(',');
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}&timeformat=unixtime&past_days=1&forecast_days=8&hourly=cloud_cover_low,cloud_cover_high,cloud_cover_mid`;
  const data = await getJson<CanvasResponse | CanvasResponse[]>(url, { ...opts, timeoutMs: 30_000 });
  return (Array.isArray(data) ? data : [data]).map(({ hourly: h }) => ({
    time: h.time.map((t) => t * 1000),
    low: h.cloud_cover_low,
    high: h.cloud_cover_high,
    mid: h.cloud_cover_mid,
  }));
}
