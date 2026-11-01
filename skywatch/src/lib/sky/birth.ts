// The sky on the day someone was born: the moon, the sun's constellation and the
// bright planets, computed locally like the rest of the sky.
import { Body, Constellation, Elongation, Equator, Horizon, Illumination, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine';
import type { City } from '../../constants/cities';
import { phaseNameFor, type MoonPhaseName } from './astro';
import { tzOffsetMinutes } from './report';

/** What the user tells us: a local calendar date and where. */
export type Birth = { date: string; place: City };

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
const PLANETS: PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

export type PlanetAtBirth = {
  name: PlanetName;
  altitude: number;
  azimuth: number;
  magnitude: number;
  constellation: Con;
  /** Above the horizon, below it, or too close to the sun to see. */
  where: 'up' | 'down' | 'glare';
};

export type BirthSky = {
  /** The moment the positions are for: early evening, when the first planets show. */
  at: Date;
  /** The sun is more than 6° down, so the sky is dark enough for stars. */
  dark: boolean;
  sunrise: Date | null;
  sunset: Date | null;
  moon: {
    phaseName: MoonPhaseName;
    illumination: number;
    waxing: boolean;
    altitude: number;
    azimuth: number;
    constellation: Con;
    rise: Date | null;
    set: Date | null;
  };
  planets: PlanetAtBirth[];
  /** Full moons from then until `now`. */
  fullMoonsSince: number;
};

const SYNODIC_DAYS = 29.530588;
// Planets this close to the sun are lost in its glare.
const GLARE_DEG = 12;
// An hour and a half after sunset, when the sky is dark and the first planets show.
const EVENING_AFTER_SUNSET_MS = 90 * 60_000;

/** A local wall-clock time in an IANA zone, as an instant. Two passes settle DST edges. */
function zonedToUtc(y: number, m: number, d: number, h: number, min: number, timezone: string) {
  const wall = Date.UTC(y, m - 1, d, h, min);
  let at = wall;
  for (let i = 0; i < 2; i++) at = wall - tzOffsetMinutes(timezone, new Date(at)) * 60_000;
  return new Date(at);
}

function altAz(body: Body, date: Date, obs: Observer) {
  const eq = Equator(body, date, obs, true, true);
  return Horizon(date, obs, eq.ra, eq.dec, 'normal');
}

/** An IAU constellation: its three-letter symbol and English name. */
export type Con = { symbol: string; name: string };

/** The constellation a body sits in, by its J2000 position. */
function constellationOf(body: Body, date: Date, obs: Observer): Con {
  const eq = Equator(body, date, obs, false, true);
  const { symbol, name } = Constellation(eq.ra, eq.dec);
  return { symbol, name };
}

export function computeBirthSky(birth: Birth, now = new Date()): BirthSky {
  const { place } = birth;
  const [y, m, d] = birth.date.split('-').map(Number);
  const obs = new Observer(place.latitude, place.longitude, 0);
  const midnight = zonedToUtc(y, m, d, 0, 0, place.timezone);
  const sunrise = SearchRiseSet(Body.Sun, obs, +1, midnight, 1)?.date ?? null;
  const sunset = SearchRiseSet(Body.Sun, obs, -1, midnight, 1)?.date ?? null;

  const at = sunset ? new Date(sunset.getTime() + EVENING_AFTER_SUNSET_MS) : zonedToUtc(y, m, d, 21, 0, place.timezone);

  const phaseAngle = MoonPhase(at);
  const moonPos = altAz(Body.Moon, at, obs);
  const rise = SearchRiseSet(Body.Moon, obs, +1, midnight, 1)?.date ?? null;
  const set = SearchRiseSet(Body.Moon, obs, -1, midnight, 1)?.date ?? null;

  const planets = PLANETS.map((name): PlanetAtBirth => {
    const body = Body[name];
    const pos = altAz(body, at, obs);
    return {
      name,
      altitude: pos.altitude,
      azimuth: pos.azimuth,
      magnitude: Illumination(body, at).mag,
      constellation: constellationOf(body, at, obs),
      where: Elongation(body, at).elongation < GLARE_DEG ? 'glare' : pos.altitude > 0 ? 'up' : 'down',
    };
  });

  // Count the times the phase has passed 180° since birth.
  const days = (now.getTime() - at.getTime()) / 86_400_000;
  const pastFull = (((phaseAngle - 180) % 360) + 360) % 360 / 360;
  const fullMoonsSince = Math.max(0, Math.floor(days / SYNODIC_DAYS + pastFull));

  return {
    at,
    dark: altAz(Body.Sun, at, obs).altitude < -6,
    sunrise,
    sunset,
    moon: {
      phaseName: phaseNameFor(phaseAngle),
      illumination: Illumination(Body.Moon, at).phase_fraction,
      waxing: phaseAngle < 180,
      altitude: moonPos.altitude,
      azimuth: moonPos.azimuth,
      constellation: constellationOf(Body.Moon, at, obs),
      rise,
      set,
    },
    planets,
    fullMoonsSince,
  };
}

// Chinese names for every constellation the sun, moon and planets pass through. The zodiac
// uses the everyday names (射手座, 水瓶座) that most people know.
const CON_ZH: Record<string, string> = {
  Ari: '白羊座', Tau: '金牛座', Gem: '双子座', Cnc: '巨蟹座', Leo: '狮子座', Vir: '处女座',
  Lib: '天秤座', Sco: '天蝎座', Oph: '蛇夫座', Sgr: '射手座', Cap: '摩羯座', Aqr: '水瓶座', Psc: '双鱼座',
  Ori: '猎户座', Cet: '鲸鱼座', Sex: '六分仪座', Sct: '盾牌座', Aur: '御夫座', Peg: '飞马座', Crv: '乌鸦座',
  Crt: '巨爵座', Hya: '长蛇座', Ser: '巨蛇座', CMi: '小犬座', Lup: '豺狼座', Equ: '小马座',
};

export const conName = (c: Con, lang: 'zh' | 'en') => (lang === 'zh' ? CON_ZH[c.symbol] ?? c.name : c.name);
