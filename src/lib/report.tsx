import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { findCity, type City } from '../constants/cities';
import { scheduleTonightAlerts } from './notifications';
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
  const { settings, lang, t } = useSettings();
  const [report, setReport] = useState<TonightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cityKey = settings.cityIds.join(',');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cities = settings.cityIds.map(findCity).filter((c): c is City => !!c);
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
