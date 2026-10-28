// GDACS (Global Disaster Alert and Coordination System) tropical cyclone feed.
// https://www.gdacs.org/gdacsapi/swagger/index.html
import AsyncStorage from '@react-native-async-storage/async-storage';
import { distanceKm } from '../geo';
import { getJson } from './http';

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC';

// GDACS keeps a storm "current" for days after its last advisory. One not
// updated for this long has weakened or gone, so it no longer counts.
const STALE_MS = 36 * 3600_000;
// Each storm's last few advisory positions, kept on the device so we can tell
// whether it is moving toward a city or away from it.
const TRACK_KEY = 'skywatch.cycloneTrack.v1';
const TRACK_POINTS = 4;
// Distance change between advisories below which a storm is holding steady.
const TREND_KM = 25;

export type Cyclone = {
  id: string;
  name: string;
  alertLevel: 'green' | 'orange' | 'red' | string;
  latitude: number;
  longitude: number;
  fromDate: string;
  isCurrent: boolean;
  /** Time of the latest advisory, if GDACS gives one. */
  updatedAt: Date | null;
  /** Position at the advisory before this one, if we saw it. */
  previous: { latitude: number; longitude: number } | null;
};

export type CycloneTrend = 'closer' | 'away' | 'steady';
export type CycloneNear = { cyclone: Cyclone; km: number; trend: CycloneTrend | null };

type GdacsFeature = {
  geometry?: { type: string; coordinates: [number, number] };
  properties: {
    eventid: number;
    episodeid?: number;
    eventname?: string;
    name?: string;
    alertlevel?: string;
    fromdate?: string;
    todate?: string;
    iscurrent?: string | boolean;
  };
};

type TrackPoint = { at: number; lat: number; lon: number };

// Rough West Pacific / South China Sea box — the basin that matters for East Asian cities.
function inWestPacific(lat: number, lon: number) {
  return lat > -5 && lat < 50 && lon > 95 && lon < 180;
}

/** GDACS times are UTC without a zone marker. */
function parseUtc(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Adds this fetch's positions to the stored tracks and returns each storm's previous position. */
async function updateTracks(cyclones: Cyclone[]): Promise<Map<string, TrackPoint>> {
  const tracks: Record<string, TrackPoint[]> = JSON.parse((await AsyncStorage.getItem(TRACK_KEY).catch(() => null)) ?? '{}');
  const next: Record<string, TrackPoint[]> = {};
  const previous = new Map<string, TrackPoint>();
  for (const c of cyclones) {
    const track = tracks[c.id] ?? [];
    const point = { at: c.updatedAt?.getTime() ?? Date.now(), lat: c.latitude, lon: c.longitude };
    const last = track[track.length - 1];
    const moved = !last || last.lat !== point.lat || last.lon !== point.lon;
    const kept = moved ? [...track, point].slice(-TRACK_POINTS) : track;
    next[c.id] = kept;
    if (kept.length >= 2) previous.set(c.id, kept[kept.length - 2]);
  }
  // Storms no longer in the feed drop out of the record.
  AsyncStorage.setItem(TRACK_KEY, JSON.stringify(next)).catch(() => {});
  return previous;
}

export async function fetchActiveCyclones(now = new Date()): Promise<Cyclone[]> {
  const data = await getJson<{ features?: GdacsFeature[] }>(GDACS_URL);

  const cyclones = (data.features ?? [])
    .filter((f) => f.geometry?.type === 'Point')
    .map((f): Cyclone => {
      const [lon, lat] = f.geometry!.coordinates;
      const p = f.properties;
      return {
        id: String(p.eventid),
        name: p.eventname || p.name || `TC ${p.eventid}`,
        alertLevel: (p.alertlevel ?? 'green').toLowerCase(),
        latitude: lat,
        longitude: lon,
        fromDate: p.fromdate ?? '',
        isCurrent: p.iscurrent === true || p.iscurrent === 'true',
        updatedAt: parseUtc(p.todate),
        previous: null,
      };
    })
    .filter((c) => c.isCurrent && inWestPacific(c.latitude, c.longitude))
    .filter((c) => !c.updatedAt || now.getTime() - c.updatedAt.getTime() < STALE_MS);

  const previous = await updateTracks(cyclones);
  return cyclones.map((c) => {
    const p = previous.get(c.id);
    return p ? { ...c, previous: { latitude: p.lat, longitude: p.lon } } : c;
  });
}

function trendFor(c: Cyclone, lat: number, lon: number, km: number): CycloneTrend | null {
  if (!c.previous) return null;
  const change = km - distanceKm(lat, lon, c.previous.latitude, c.previous.longitude);
  return change < -TREND_KM ? 'closer' : change > TREND_KM ? 'away' : 'steady';
}

export function nearestCyclone(cyclones: Cyclone[], lat: number, lon: number): CycloneNear | null {
  let best: { cyclone: Cyclone; km: number } | null = null;
  for (const c of cyclones) {
    const km = distanceKm(lat, lon, c.latitude, c.longitude);
    if (!best || km < best.km) best = { cyclone: c, km };
  }
  return best && { ...best, trend: trendFor(best.cyclone, lat, lon, best.km) };
}
