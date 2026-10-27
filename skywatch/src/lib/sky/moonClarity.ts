// How clearly the moon will show: clouds in the way, fog or haze dimming it,
// and rain. Even a full moon can be lost behind thick cloud or in fog.
import type { NightWeather } from '../api/openMeteo';

export type ClarityLevel = 'clear' | 'fair' | 'hazy' | 'hidden';
export type ClarityReason = 'cloud' | 'fog' | 'haze' | 'rain';

export type MoonClarity = {
  score: number; // 0–100
  level: ClarityLevel;
  reasons: ClarityReason[];
  /** 0 clear sky … 1 fully covered, for drawing clouds. */
  cover: number;
  /** 0 clear air … 1 thick fog, for drawing haze. */
  fog: number;
  visibilityKm: number;
  at: Date;
};

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// How much of the moon's light gets through air of a given visibility,
// interpolated on a log scale between these points.
const HAZE: [number, number][] = [
  [300, 0.05],
  [1000, 0.15],
  [2000, 0.32],
  [5000, 0.62],
  [10000, 0.85],
  [20000, 1],
];

function airClarity(visibility: number) {
  if (visibility <= HAZE[0][0]) return HAZE[0][1];
  for (let i = 1; i < HAZE.length; i++) {
    const [v1, c1] = HAZE[i];
    if (visibility <= v1) {
      const [v0, c0] = HAZE[i - 1];
      const f = Math.log(visibility / v0) / Math.log(v1 / v0);
      return c0 + (c1 - c0) * f;
    }
  }
  return 1;
}

export function clarityAt(w: NightWeather, at: Date): MoonClarity | null {
  const t = at.getTime();
  let i = -1;
  let best = Infinity;
  w.time.forEach((ts, j) => {
    const d = Math.abs(ts - t);
    if (d < best) {
      best = d;
      i = j;
    }
  });
  // Outside the forecast window there is nothing to say.
  if (i < 0 || best > 90 * 60_000 || w.cloud[i] == null) return null;

  const low = w.cloudLow[i] ?? 0;
  const mid = w.cloudMid[i] ?? 0;
  const high = w.cloudHigh[i] ?? 0;
  // Low and mid cloud block the moon; thin high cloud only veils it.
  const cover = clamp(Math.max(w.cloud[i] * 0.6, low + 0.85 * mid + 0.35 * high) / 100);
  const visibility = w.visibility[i] ?? 24000;
  const air = airClarity(visibility) * (w.humidity[i] > 95 ? 0.85 : 1);
  const rainy = (w.precipProbability[i] ?? 0) >= 60;

  const score = Math.round(100 * (1 - 0.92 * cover) * air * (rainy ? 0.55 : 1));
  const reasons: ClarityReason[] = [];
  if (cover > 0.55) reasons.push('cloud');
  if (visibility < 2000) reasons.push('fog');
  else if (visibility < 8000) reasons.push('haze');
  if (rainy) reasons.push('rain');

  return {
    score,
    level: score >= 72 ? 'clear' : score >= 48 ? 'fair' : score >= 22 ? 'hazy' : 'hidden',
    reasons,
    cover,
    fog: clamp(1 - air),
    visibilityKm: visibility / 1000,
    at,
  };
}

/** When to look: an hour after sunset, or soon after moonrise if the moon comes up later. */
export function moonViewTime(sunset: Date, moonrise: Date | null) {
  const evening = sunset.getTime() + 3600_000;
  if (moonrise && moonrise.getTime() > evening && moonrise.getTime() < sunset.getTime() + 12 * 3600_000) {
    return new Date(moonrise.getTime() + 45 * 60_000);
  }
  return new Date(evening);
}
