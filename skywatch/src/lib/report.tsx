import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { findCity, HERE_ID, type City } from '../constants/cities';
import { distanceKm } from './geo';
import { scheduleTonightAlerts } from './notifications';
import { locateHere } from './places';
import { useSettings } from './settings';
import { buildTonightReport, type CityReport, type TonightReport } from './sky/report';

type ReportContextValue = {
  report: TonightReport | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const ReportContext = createContext<ReportContextValue | null>(null);

// One shared report so the Tonight list and the detail scenes show the same numbers.
export function ReportProvider({ children }: { children: ReactNode }) {
  const { settings, update, lang, t } = useSettings();
  const [report, setReport] = useState<TonightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cities = settings.cityIds.map((id) => findCity(id, settings.customCities)).filter((c): c is City => !!c);
  // Includes coordinates so a moved current-location city refetches.
  const cityKey = cities.map((c) => `${c.id}@${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`).join('|');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await buildTonightReport(cities);
      setReport(next);
      scheduleTonightAlerts(next, settings, lang, t).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityKey, settings.alerts, lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Once per launch, move the current-location city if the device has moved.
  const followsHere = settings.cityIds.includes(HERE_ID);
  const relocated = useRef(false);
  useEffect(() => {
    if (!followsHere || relocated.current) return;
    relocated.current = true;
    locateHere(false).then((res) => {
      if (!('city' in res)) return;
      const old = settings.customCities.find((c) => c.id === HERE_ID);
      if (old && distanceKm(old.latitude, old.longitude, res.city.latitude, res.city.longitude) < 3) return;
      update({ customCities: [...settings.customCities.filter((c) => c.id !== HERE_ID), res.city] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followsHere]);

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
