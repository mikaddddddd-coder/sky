// GDACS (Global Disaster Alert and Coordination System) tropical cyclone feed.
// https://www.gdacs.org/gdacsapi/swagger/index.html
import { distanceKm } from '../geo';

const GDACS_URL = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC';

export type Cyclone = {
  id: string;
  name: string;
  alertLevel: 'green' | 'orange' | 'red' | string;
  latitude: number;
  longitude: number;
  fromDate: string;
  isCurrent: boolean;
};

type GdacsFeature = {
  geometry?: { type: string; coordinates: [number, number] };
  properties: {
    eventid: number;
    episodeid?: number;
    eventname?: string;
    name?: string;
    alertlevel?: string;
    fromdate?: string;
    iscurrent?: string | boolean;
  };
};

// Rough West Pacific / South China Sea box — the basin that matters for East Asian cities.
function inWestPacific(lat: number, lon: number) {
  return lat > -5 && lat < 50 && lon > 95 && lon < 180;
}

export async function fetchActiveCyclones(): Promise<Cyclone[]> {
  const res = await fetch(GDACS_URL);
  if (!res.ok) throw new Error(`GDACS HTTP ${res.status}`);
  const data = (await res.json()) as { features?: GdacsFeature[] };

  return (data.features ?? [])
    .filter((f) => f.geometry?.type === 'Point')
    .map((f) => {
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
      };
    })
    .filter((c) => c.isCurrent && inWestPacific(c.latitude, c.longitude));
}

export function nearestCyclone(cyclones: Cyclone[], lat: number, lon: number) {
  let best: { cyclone: Cyclone; km: number } | null = null;
  for (const c of cyclones) {
    const km = distanceKm(lat, lon, c.latitude, c.longitude);
    if (!best || km < best.km) best = { cyclone: c, km };
  }
  return best;
}
