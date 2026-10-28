// Heuristic sunset-glow ("火烧云") model.
//
// A vivid glow needs three things at once:
//   1. A canvas: mid/high clouds overhead for the low sun to light from below.
//   2. A clear path: few low clouds toward the sunset azimuth (~150 km west),
//      otherwise the sunlight never reaches the canvas.
//   3. Clean-ish air: moderate aerosols scatter red light; heavy haze greys it out.
// Rain just before sunset that clears up is a well-known bonus.
import type { CanvasClouds, PointForecast } from '../api/openMeteo';
import { levelFromScore, type Level } from './level';

export type GlowReason =
  | 'canvas'
  | 'noCanvas'
  | 'overcast'
  | 'lowBlock'
  | 'clearWest'
  | 'afterRain'
  | 'raining'
  | 'hazy'
  | 'clean'
  | 'humid';

const POSITIVE = new Set<GlowReason>(['canvas', 'clearWest', 'afterRain', 'clean']);

export type GlowInputs = {
  localLow: number;
  localMid: number;
  localHigh: number;
  westLow: number;
  westMid: number;
  humidity: number;
  precipProbability: number;
  precipAtSunset: number;
  precipBefore: number; // mm in the 6h before sunset
  aod: number | null;
};

export type GlowForecast = {
  /** How vivid it would get if it lights up, 0–100; null when the clouds toward the sunset are unknown. */
  vividness: number | null;
  /** How far toward the sunset the cloud ends, in km; null when unknown. */
  edgeKm: number | null;
  score: number; // 0–100, read as "chance of a memorable glow"
  level: Level;
  reasons: GlowReason[];
  inputs: GlowInputs;
};

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Bell curve peaking at `center` with half-width `width`. */
const bell = (x: number, center: number, width: number) => Math.exp(-(((x - center) / width) ** 2));

// --- Vividness -------------------------------------------------------------
// How red and bright the sky gets once it lights up, after ChromaSky's index
// (github.com/lanseria/chromasky-toolkit). What matters most is where the cloud
// overhead ends toward the sunset: about 400 km out, the low sun can shine in
// beneath the whole cloud sheet and light it from below. Cloud shape counts a
// little; low cloud, haze and rain take it away.

/** Distances along the sunset direction at which clouds are sampled. */
export const RAY_KM = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
const EDGE_CLOUD = 10; // % high+mid cloud below which the cloud sheet has ended
const BEST_EDGE_KM = 400;
const MAX_EDGE_KM = 500;
export const VIVID_THRESHOLD = 60;

export type VividLevel = 'vivid' | 'fair' | 'pale';
export const vividLevel = (v: number): VividLevel => (v >= VIVID_THRESHOLD ? 'vivid' : v >= 35 ? 'fair' : 'pale');

export type AodLevel = 'clear' | 'fair' | 'hazy';
/** Judged on the value as shown (two decimals), so the label never disagrees with the number. */
export const aodLevel = (aod: number): AodLevel => {
  const a = Math.round(aod * 100) / 100;
  return a < 0.3 ? 'clear' : a < 0.6 ? 'fair' : 'hazy';
};

function edgeScore(km: number) {
  if (km >= MAX_EDGE_KM) return 0;
  if (km <= BEST_EDGE_KM) return km / BEST_EDGE_KM;
  return 1 - (km - BEST_EDGE_KM) / (MAX_EDGE_KM - BEST_EDGE_KM);
}
const highShape = (h: number) => (h >= 40 && h <= 80 ? 1 : h > 80 ? 0.7 : h >= 10 ? 0.6 : 0.1);
const midShape = (m: number) => (m >= 20 && m <= 50 ? 1 : m > 50 && m <= 80 ? 0.7 : m > 80 ? 0.3 : 0.2);
const lowPenalty = (l: number) => (l <= 10 ? 1 : l <= 30 ? 0.6 : l <= 50 ? 0.1 : 0);
const aodPenalty = (a: number | null) => (a === null ? 1 : a < 0.3 ? 1 : a < 0.6 ? 0.5 : 0);

/** `ray` is high/mid cloud at sunset at each of RAY_KM, in order. */
function vividnessFor(i: GlowInputs, ray: { high: number; mid: number }[] | null): { vividness: number | null; edgeKm: number | null } {
  if (!ray) return { vividness: null, edgeKm: null };
  // Nothing overhead to light up.
  if (i.localHigh + i.localMid < EDGE_CLOUD) return { vividness: 0, edgeKm: 0 };
  const k = ray.findIndex((p) => p.high + p.mid < EDGE_CLOUD);
  const edgeKm = k === -1 ? MAX_EDGE_KM : RAY_KM[k];
  // No edge in reach: a thick sheet all the way shuts the sun out, but thin,
  // broken cloud lets it through the gaps, so that still counts for a fair amount.
  const thickness = ray.reduce((sum, p) => sum + Math.min(100, p.high + p.mid), 0) / ray.length;
  const edge = k === -1 ? clamp(1 - thickness / 70, 0, 0.7) : edgeScore(edgeKm);
  const quality = 0.8 * edge + 0.1 * highShape(i.localHigh) + 0.1 * midShape(i.localMid);
  const rain = i.precipAtSunset > 0.2 || i.precipProbability > 60 ? 0.35 : 1;
  const v = quality * lowPenalty(Math.max(i.localLow, i.westLow)) * aodPenalty(i.aod) * rain;
  return { vividness: Math.round(clamp(v) * 100), edgeKm };
}

export function scoreGlow(i: GlowInputs, ray: { high: number; mid: number }[] | null = null): GlowForecast {
  const reasons: GlowReason[] = [];

  // 1. Canvas — high clouds count fully, mid clouds slightly less (they are thicker).
  const canvas = clamp((i.localHigh + 0.8 * i.localMid) / 100, 0, 1.5) * 100;
  let canvasScore = bell(canvas, 50, 35);
  if (canvas < 15) reasons.push('noCanvas');
  else if (canvas > 95 || i.localLow > 80) {
    reasons.push('overcast');
    canvasScore *= 0.4;
  } else reasons.push('canvas');

  // 2. Path for the sunlight toward the west.
  const block = Math.max(i.westLow, i.localLow * 0.6, i.westMid > 90 ? i.westMid * 0.7 : 0);
  const pathScore = 1 - clamp((block - 20) / 60);
  if (block > 50) reasons.push('lowBlock');
  else if (block < 20) reasons.push('clearWest');

  // 3. Air quality.
  let airScore = 1;
  if (i.aod !== null) {
    if (i.aod > 0.6) {
      airScore = 1 - clamp((i.aod - 0.6) / 0.8, 0, 0.7);
      reasons.push('hazy');
    } else if (i.aod < 0.25) reasons.push('clean');
  }
  if (i.humidity > 92) {
    airScore *= 0.8;
    reasons.push('humid');
  }

  // 4. Rain modifiers.
  let rainFactor = 1;
  if (i.precipAtSunset > 0.2 || i.precipProbability > 60) {
    rainFactor = 0.35;
    reasons.push('raining');
  } else if (i.precipBefore > 0.5) {
    rainFactor = 1.15;
    reasons.push('afterRain');
  }

  const score = Math.round(clamp(canvasScore * pathScore * airScore * rainFactor) * 100);
  // Lead with what hurts; when the glow is unlikely, upbeat reasons only confuse.
  const negatives = reasons.filter((r) => !POSITIVE.has(r));
  const positives = score >= 25 ? reasons.filter((r) => POSITIVE.has(r)) : [];
  return { score, level: levelFromScore(score), reasons: [...negatives, ...positives], inputs: i, ...vividnessFor(i, ray) };
}

/** Value at the hour closest to `t`, averaged with its neighbours to smooth model noise. */
function around(series: (number | null)[], times: number[], t: number): number | null {
  let idx = 0;
  for (let k = 0; k < times.length; k++) if (Math.abs(times[k] - t) < Math.abs(times[idx] - t)) idx = k;
  const vals = [series[idx - 1], series[idx], series[idx + 1]].filter((v): v is number => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function sumBetween(series: number[], times: number[], from: number, to: number) {
  return times.reduce((acc, t, k) => (t >= from && t < to ? acc + (series[k] ?? 0) : acc), 0);
}

export function glowFromForecasts(local: PointForecast, west: PointForecast, sunset: Date, ray: CanvasClouds[] | null = null): GlowForecast {
  const t = sunset.getTime();
  const at = (s: (number | null)[], f = local) => around(s, f.time, t) ?? 0;
  const rayAtSunset = ray && ray.map((p) => ({ high: around(p.high, p.time, t) ?? 0, mid: around(p.mid, p.time, t) ?? 0 }));
  return scoreGlow({
    localLow: at(local.cloudLow),
    localMid: at(local.cloudMid),
    localHigh: at(local.cloudHigh),
    westLow: at(west.cloudLow, west),
    westMid: at(west.cloudMid, west),
    humidity: at(local.humidity),
    precipProbability: at(local.precipProbability),
    precipAtSunset: at(local.precipitation),
    precipBefore: sumBetween(local.precipitation, local.time, t - 6 * 3600_000, t - 3600_000),
    aod: around(local.aod, local.time, t),
  }, rayAtSunset);
}
