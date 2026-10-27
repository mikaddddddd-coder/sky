// Evening sky events computed locally with astronomy-engine (no network needed).
import {
  AngleBetween,
  Body,
  Elongation,
  Equator,
  GeoVector,
  Horizon,
  Illumination,
  MoonPhase,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from 'astronomy-engine';
import { levelFromScore, type Level } from './level';

export type SunTimes = {
  sunrise: Date;
  sunset: Date;
  civilDusk: Date;
  sunsetAzimuth: number;
};

export type MoonPhaseName =
  | 'new'
  | 'waxingCrescent'
  | 'firstQuarter'
  | 'waxingGibbous'
  | 'full'
  | 'waningGibbous'
  | 'lastQuarter'
  | 'waningCrescent';

const PHASE_NAMES: MoonPhaseName[] = [
  'new',
  'waxingCrescent',
  'firstQuarter',
  'waxingGibbous',
  'full',
  'waningGibbous',
  'lastQuarter',
  'waningCrescent',
];

export type MoonInfo = {
  phaseName: MoonPhaseName;
  moonset: Date | null;
  illumination: number; // 0–1
  phaseAngle: number; // 0 new, 90 first quarter, 180 full, 270 last quarter
  waxing: boolean;
  moonrise: Date | null;
  altitudeAfterSunset: number;
  highlight: 'crescent' | 'fullRise' | 'high' | 'none';
  score: number;
  level: Level;
};

export type VenusInfo = {
  /** Best moment to look: civil dusk for an evening star, civil dawn for a morning star. */
  bestTime: Date;
  altitudeAtBest: number;
  azimuthAtBest: number;
  /** Lit fraction of the disc; Venus shows phases like the Moon through binoculars. */
  phaseFraction: number;
  altitudeAtDusk: number;
  elongation: number;
  magnitude: number;
  visibility: 'evening' | 'morning';
  highlight: 'good' | 'low' | 'morning' | 'nearSun';
  score: number;
  level: Level;
};

export type ConjunctionInfo = { separation: number } | null;

export type EveningSky = { sun: SunTimes; moon: MoonInfo; venus: VenusInfo; conjunction: ConjunctionInfo };

function altAz(body: Body, date: Date, obs: Observer) {
  const eq = Equator(body, date, obs, true, true);
  return Horizon(date, obs, eq.ra, eq.dec, 'normal');
}

/** Start of the local calendar day containing `date`, shifted to roughly local noon so rise/set searches find *this* evening. */
function localNoon(date: Date, tzOffsetMinutes: number) {
  const local = new Date(date.getTime() + tzOffsetMinutes * 60_000);
  local.setUTCHours(12, 0, 0, 0);
  return new Date(local.getTime() - tzOffsetMinutes * 60_000);
}

export function computeEveningSky(lat: number, lon: number, date: Date, tzOffsetMinutes: number): EveningSky {
  const obs = new Observer(lat, lon, 0);
  const noon = localNoon(date, tzOffsetMinutes);

  const sunset = SearchRiseSet(Body.Sun, obs, -1, noon, 1)?.date ?? new Date(noon.getTime() + 6 * 3600_000);
  const civilDusk = SearchAltitude(Body.Sun, obs, -1, noon, 1, -6)?.date ?? new Date(sunset.getTime() + 30 * 60_000);
  const sunrise = SearchRiseSet(Body.Sun, obs, +1, new Date(noon.getTime() - 12 * 3600_000), 1)?.date ?? new Date(noon.getTime() - 6 * 3600_000);
  const sun: SunTimes = { sunrise, sunset, civilDusk, sunsetAzimuth: altAz(Body.Sun, sunset, obs).azimuth };

  return { sun, moon: moonInfo(obs, noon, sunset), venus: venusInfo(obs, civilDusk, sunset), conjunction: conjunction(civilDusk) };
}

function moonInfo(obs: Observer, noon: Date, sunset: Date): MoonInfo {
  const viewTime = new Date(sunset.getTime() + 3600_000);
  const phaseAngle = MoonPhase(viewTime);
  const illumination = Illumination(Body.Moon, viewTime).phase_fraction;
  const waxing = phaseAngle < 180;
  const altitudeAfterSunset = altAz(Body.Moon, viewTime, obs).altitude;
  const moonrise = SearchRiseSet(Body.Moon, obs, +1, noon, 1)?.date ?? null;
  const moonset = moonrise ? SearchRiseSet(Body.Moon, obs, -1, moonrise, 2)?.date ?? null : null;
  const phaseName = PHASE_NAMES[Math.round(phaseAngle / 45) % 8];
  const risesNearSunset = moonrise !== null && Math.abs(moonrise.getTime() - sunset.getTime()) < 75 * 60_000;

  let highlight: MoonInfo['highlight'] = 'none';
  let score = 0;
  if (waxing && illumination > 0.03 && illumination < 0.35 && altitudeAfterSunset > 5) {
    highlight = 'crescent';
    score = 70 + Math.min(25, altitudeAfterSunset);
  } else if (illumination > 0.96 && risesNearSunset) {
    highlight = 'fullRise';
    score = 90;
  } else if (altitudeAfterSunset > 20 && illumination > 0.35) {
    highlight = 'high';
    score = 40 + illumination * 30;
  } else {
    score = Math.max(0, altitudeAfterSunset) * illumination;
  }
  score = Math.round(Math.min(100, score));

  return {
    illumination,
    phaseAngle,
    phaseName,
    waxing,
    moonrise,
    moonset,
    altitudeAfterSunset,
    highlight,
    score,
    level: levelFromScore(score),
  };
}

function venusInfo(obs: Observer, civilDusk: Date, sunset: Date): VenusInfo {
  const elong = Elongation(Body.Venus, civilDusk);
  const altitudeAtDusk = altAz(Body.Venus, civilDusk, obs).altitude;
  const illum = Illumination(Body.Venus, civilDusk);
  const magnitude = illum.mag;
  const visibility = elong.visibility === 'evening' ? 'evening' : 'morning';
  const civilDawn = SearchAltitude(Body.Sun, obs, +1, sunset, 1, -6)?.date ?? new Date(sunset.getTime() + 12 * 3600_000);
  const bestTime = visibility === 'evening' ? civilDusk : civilDawn;
  const best = altAz(Body.Venus, bestTime, obs);

  let highlight: VenusInfo['highlight'];
  let score: number;
  if (elong.elongation < 10) {
    // Lost in the Sun's glare around conjunction, whichever side it is on.
    highlight = 'nearSun';
    score = 0;
  } else if (visibility === 'morning') {
    highlight = 'morning';
    score = 0;
  } else if (altitudeAtDusk > 8 && elong.elongation > 15) {
    highlight = 'good';
    score = Math.min(100, 40 + altitudeAtDusk * 2 + Math.max(0, -magnitude - 3.8) * 20);
  } else {
    highlight = 'low';
    score = Math.max(0, altitudeAtDusk * 3);
  }
  score = Math.round(score);
  return {
    bestTime,
    altitudeAtBest: best.altitude,
    azimuthAtBest: best.azimuth,
    phaseFraction: illum.phase_fraction,
    altitudeAtDusk,
    elongation: elong.elongation,
    magnitude,
    visibility,
    highlight,
    score,
    level: levelFromScore(score),
  };
}

function conjunction(t: Date): ConjunctionInfo {
  const separation = AngleBetween(GeoVector(Body.Moon, t, true), GeoVector(Body.Venus, t, true));
  return separation < 6 ? { separation } : null;
}

/** A span of the day when the sun sits between two altitudes, e.g. golden hour. */
export type LightWindow = { start: Date; end: Date } | null;

export type SunDay = {
  astronomicalDawn: Date | null;
  sunrise: Date | null;
  solarNoon: Date;
  noonAltitude: number;
  sunset: Date | null;
  astronomicalDusk: Date | null;
  morningBlue: LightWindow;
  morningGolden: LightWindow;
  eveningGolden: LightWindow;
  eveningBlue: LightWindow;
  /** Milliseconds of daylight today and yesterday, for the day-length trend. */
  dayLength: number;
  dayLengthYesterday: number;
  sunriseAzimuth: number | null;
  sunsetAzimuth: number | null;
};

// Common photographers' definitions: golden hour while the sun is between
// 6° above and 4° below the horizon, blue hour from 4° to 8° below.
const GOLDEN_TOP = 6;
const GOLDEN_BOTTOM = -4;
const BLUE_BOTTOM = -8;

function crossing(obs: Observer, direction: 1 | -1, from: Date, altitude: number) {
  return SearchAltitude(Body.Sun, obs, direction, from, 1, altitude)?.date ?? null;
}

function span(start: Date | null, end: Date | null): LightWindow {
  return start && end ? { start, end } : null;
}

function daylight(obs: Observer, midnight: Date) {
  const rise = SearchRiseSet(Body.Sun, obs, +1, midnight, 1)?.date ?? null;
  const set = SearchRiseSet(Body.Sun, obs, -1, midnight, 1)?.date ?? null;
  return { rise, set, length: rise && set && set > rise ? set.getTime() - rise.getTime() : 0 };
}

/** Everything about the sun's day at one place, from first light to full dark. */
export function computeSunDay(lat: number, lon: number, date: Date, tzOffsetMinutes: number): SunDay {
  const obs = new Observer(lat, lon, 0);
  const midnight = new Date(localNoon(date, tzOffsetMinutes).getTime() - 12 * 3600_000);
  const noonEvent = SearchHourAngle(Body.Sun, obs, 0, midnight, +1);
  const solarNoon = noonEvent.time.date;
  const today = daylight(obs, midnight);
  const yesterday = daylight(obs, new Date(midnight.getTime() - 24 * 3600_000));

  const up = (alt: number) => crossing(obs, +1, midnight, alt);
  const down = (alt: number) => crossing(obs, -1, solarNoon, alt);

  return {
    astronomicalDawn: up(-18),
    sunrise: today.rise,
    solarNoon,
    noonAltitude: noonEvent.hor.altitude,
    sunset: today.set,
    astronomicalDusk: down(-18),
    morningBlue: span(up(BLUE_BOTTOM), up(GOLDEN_BOTTOM)),
    morningGolden: span(up(GOLDEN_BOTTOM), up(GOLDEN_TOP)),
    eveningGolden: span(down(GOLDEN_TOP), down(GOLDEN_BOTTOM)),
    eveningBlue: span(down(GOLDEN_BOTTOM), down(BLUE_BOTTOM)),
    dayLength: today.length,
    dayLengthYesterday: yesterday.length,
    sunriseAzimuth: today.rise ? altAz(Body.Sun, today.rise, obs).azimuth : null,
    sunsetAzimuth: today.set ? altAz(Body.Sun, today.set, obs).azimuth : null,
  };
}
