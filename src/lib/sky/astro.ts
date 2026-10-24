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
  SearchRiseSet,
} from 'astronomy-engine';
import { levelFromScore, type Level } from './level';

export type SunTimes = {
  sunset: Date;
  civilDusk: Date;
  sunsetAzimuth: number;
};

export type MoonInfo = {
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
  altitudeAtDusk: number;
  elongation: number;
  magnitude: number;
  visibility: 'evening' | 'morning';
  highlight: 'good' | 'low' | 'morning';
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
  const sun: SunTimes = { sunset, civilDusk, sunsetAzimuth: altAz(Body.Sun, sunset, obs).azimuth };

  return { sun, moon: moonInfo(obs, noon, sunset), venus: venusInfo(obs, civilDusk), conjunction: conjunction(civilDusk) };
}

function moonInfo(obs: Observer, noon: Date, sunset: Date): MoonInfo {
  const viewTime = new Date(sunset.getTime() + 3600_000);
  const phaseAngle = MoonPhase(viewTime);
  const illumination = Illumination(Body.Moon, viewTime).phase_fraction;
  const waxing = phaseAngle < 180;
  const altitudeAfterSunset = altAz(Body.Moon, viewTime, obs).altitude;
  const moonrise = SearchRiseSet(Body.Moon, obs, +1, noon, 1)?.date ?? null;
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

  return { illumination, phaseAngle, waxing, moonrise, altitudeAfterSunset, highlight, score, level: levelFromScore(score) };
}

function venusInfo(obs: Observer, civilDusk: Date): VenusInfo {
  const elong = Elongation(Body.Venus, civilDusk);
  const altitudeAtDusk = altAz(Body.Venus, civilDusk, obs).altitude;
  const magnitude = Illumination(Body.Venus, civilDusk).mag;
  const visibility = elong.visibility === 'evening' ? 'evening' : 'morning';

  let highlight: VenusInfo['highlight'];
  let score: number;
  if (visibility === 'morning') {
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
  return { altitudeAtDusk, elongation: elong.elongation, magnitude, visibility, highlight, score, level: levelFromScore(score) };
}

function conjunction(t: Date): ConjunctionInfo {
  const separation = AngleBetween(GeoVector(Body.Moon, t, true), GeoVector(Body.Venus, t, true));
  return separation < 6 ? { separation } : null;
}
