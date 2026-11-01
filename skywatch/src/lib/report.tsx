import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { findCity, HERE_ID, type City } from '../constants/cities';
import { distanceKm } from './geo';
import { syncBackgroundRefresh } from './background';
import { scheduleTonightAlerts } from './notifications';
import { locateHere } from './places';
import { useSettings, type Settings } from './settings';
import { syncWidgets } from './widgets';
import { buildTonightReport, type CityReport, type TonightReport } from './sky/report';

type ReportContextValue = {
  report: TonightReport | null;
  loading: boolean;
  error: string | null;
  /** Pulled by hand: skips the short-lived network cache so the numbers are as fresh as the models. */
  refresh: () => Promise<void>;
};

const ReportContext = createContext<ReportContextValue | null>(null);

// The last report is kept on the device so the app opens straight onto it
// while a fresh one loads; "updated at" says how old it is.
const CACHE_KEY = 'skywatch.report.v3';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const reviveDates = (_key: string, v: unknown) => (typeof v === 'string' && ISO_DATE.test(v) ? new Date(v) : v);

export const citiesFor = (s: Settings) => s.cityIds.map((id) => findCity(id, s.customCities)).filter((c): c is City => !!c);
// Includes coordinates so a moved current-location city refetches.
export const cityKeyFor = (cities: City[]) => cities.map((c) => `${c.id}@${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`).join('|');

/** Saves a report the app can open straight onto; one with a failed city is not worth keeping. */
export async function saveReport(cityKey: string, report: TonightReport) {
  if (report.cities.some((c) => c.error)) return;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ cityKey, report }));
}

async function loadReport(cityKey: string): Promise<TonightReport | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  const saved = JSON.parse(raw, reviveDates) as { cityKey: string; report: TonightReport };
  return saved.cityKey === cityKey ? saved.report : null;
}

function keepForecasts(next: TonightReport, prev: TonightReport): TonightReport {
  return {
    ...next,
    cities: next.cities.map((c) => {
      const old = c.error ? prev.cities.find((p) => p.city.id === c.city.id && !p.error) : undefined;
      return old ? { ...c, glow: old.glow, today: old.today, glowSunset: old.glowSunset, glowTomorrow: old.glowTomorrow, week: old.week, dawnIndex: old.dawnIndex, duskIndex: old.duskIndex, error: undefined } : c;
    }),
  };
}

// One shared report so the Tonight list and the detail scenes show the same numbers.
export function ReportProvider({ children }: { children: ReactNode }) {
  // Nothing runs on the default cities and alerts while the saved settings are still being read:
  // a report built on them would schedule alerts, typhoons included, for cities the user never chose.
  const { settings, ready, update, lang, t } = useSettings();
  const [report, setReport] = useState<TonightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cities = citiesFor(settings);
  const cityKey = cityKeyFor(cities);

  const load = useCallback(async (fresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Changing the language or an alert only reschedules; the forecasts come from the network cache.
      const next = await buildTonightReport(cities, new Date(), { fresh });
      // A city whose forecast failed keeps the forecast it already had, rather than
      // swapping good numbers for an error; only a clean report is saved.
      setReport((prev) => (prev ? keepForecasts(next, prev) : next));
      saveReport(cityKey, next).catch(() => {});
      scheduleTonightAlerts(next, settings, lang, t).catch(() => {});
      syncWidgets(next, settings, lang, t, { foreground: true }).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey, settings.alerts, settings.glowAlert, settings.member, lang]);
  const refresh = useCallback(() => load(true), [load]);

  // Show the saved report for these cities until the network answers; never over a fresher one.
  useEffect(() => {
    if (!ready) return;
    loadReport(cityKey)
      .then((saved) => saved && setReport((prev) => prev ?? saved))
      .catch(() => {});
  }, [ready, cityKey]);

  useEffect(() => {
    if (ready) load(false);
  }, [ready, load]);

  const anyAlert = settings.alerts.glow || settings.alerts.sky || settings.alerts.typhoon || settings.alerts.feedback !== false;
  useEffect(() => {
    if (ready) syncBackgroundRefresh(anyAlert);
  }, [ready, anyAlert]);

  // Once per launch, move the current-location city if the device has moved.
  const followsHere = settings.cityIds.includes(HERE_ID);
  const relocated = useRef(false);
  useEffect(() => {
    if (!ready || !followsHere || relocated.current) return;
    relocated.current = true;
    locateHere(false).then((res) => {
      if (!('city' in res)) return;
      const old = settings.customCities.find((c) => c.id === HERE_ID);
      // Also when only the name changed, so a name saved in the wrong language is put right.
      const sameName = old?.name.zh === res.city.name.zh && old?.name.en === res.city.name.en;
      if (old && sameName && distanceKm(old.latitude, old.longitude, res.city.latitude, res.city.longitude) < 3) return;
      update({ customCities: [...settings.customCities.filter((c) => c.id !== HERE_ID), res.city] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, followsHere]);

  return <ReportContext.Provider value={{ report, loading, error, refresh }}>{children}</ReportContext.Provider>;
}

export function useTonightReport() {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error('useTonightReport must be used inside ReportProvider');
  return ctx;
}

export function useCityReport(cityId: string | undefined): CityReport | undefined {
  const { report } = useTonightReport();
  return report?.cities.find((c) => c.city.id === cityId) ?? report?.cities[0];
}
