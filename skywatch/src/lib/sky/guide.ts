// When and where to stand for one glow: which way to face, when the clouds burn
// reddest, and the golden and blue light either side of it.
import { Body, Equator, Horizon, Observer, SearchAltitude } from 'astronomy-engine';
import type { GlowKind } from './report';
import type { GlowForecast } from './sunsetGlow';

export type Span = { from: Date; to: Date };

export type ShootGuide = {
  /** Where the sun meets the horizon, degrees clockwise from north. */
  azimuth: number;
  /** The clouds at their reddest. */
  peak: Span;
  /** Sun between 6° and the horizon: warm, low light on the land. */
  golden: Span | null;
  /** Sun 4–6° below the horizon: the deep blue after (or before) the colour. */
  blue: Span | null;
  tip: 'rain' | 'lowBlock' | 'highLate' | 'clear';
};

const MIN = 60_000;
// High cloud sits so far up it stays lit well after the sun has set below you; mid cloud less so.
const AFTERGLOW_MIN = { high: 25, mid: 15, low: 8 };
const LOW_BLOCK = 40; // % low cloud toward the sun at which it may be shut out
const HIGH_CANVAS = 20;
const RAIN_LIKELY = 50; // % chance of rain at which that is the thing to plan for

function azimuthAt(at: Date, obs: Observer) {
  const eq = Equator(Body.Sun, at, obs, true, true);
  return Horizon(at, obs, eq.ra, eq.dec, 'normal').azimuth;
}

/** When the sun crosses `alt` degrees on its way down (dusk) or up (dawn), searching from `from`. */
function crossing(obs: Observer, kind: GlowKind, from: Date, alt: number) {
  return SearchAltitude(Body.Sun, obs, kind === 'dusk' ? -1 : +1, from, 1, alt)?.date ?? null;
}

export function shootingGuide(latitude: number, longitude: number, kind: GlowKind, at: Date, g: GlowForecast): ShootGuide {
  const obs = new Observer(latitude, longitude, 0);
  const { localHigh, localMid, westLow, precipProbability } = g.inputs;
  const layer = localHigh >= HIGH_CANVAS && localHigh >= localMid ? 'high' : localMid >= HIGH_CANVAS ? 'mid' : 'low';
  const glowMin = AFTERGLOW_MIN[layer];

  // Searches start a few hours before so they find this sunset's (or sunrise's) crossings, not the next.
  const before = new Date(at.getTime() - 4 * 3600_000);
  const six = crossing(obs, kind, before, 6);
  const minus4 = crossing(obs, kind, before, -4);
  const minus6 = crossing(obs, kind, before, -6);
  const span = (a: Date | null, b: Date | null) => (a && b ? (a < b ? { from: a, to: b } : { from: b, to: a }) : null);

  return {
    azimuth: azimuthAt(at, obs),
    // The colour starts a few minutes before the sun touches the horizon and lasts as long as the clouds stay lit.
    peak:
      kind === 'dusk'
        ? { from: new Date(at.getTime() - 5 * MIN), to: new Date(at.getTime() + glowMin * MIN) }
        : { from: new Date(at.getTime() - glowMin * MIN), to: new Date(at.getTime() + 5 * MIN) },
    golden: span(six, at),
    blue: span(minus4, minus6),
    tip: precipProbability >= RAIN_LIKELY ? 'rain' : westLow >= LOW_BLOCK ? 'lowBlock' : layer === 'high' ? 'highLate' : 'clear',
  };
}

const COMPASS_ZH = ['正北', '北偏东', '东北', '东偏北', '正东', '东偏南', '东南', '南偏东', '正南', '南偏西', '西南', '西偏南', '正西', '西偏北', '西北', '北偏西'];
const COMPASS_EN = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** A compass point for an azimuth, e.g. 西偏南 / WSW. */
export function compassPoint(azimuth: number, lang: 'zh' | 'en') {
  const i = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return (lang === 'zh' ? COMPASS_ZH : COMPASS_EN)[i];
}
