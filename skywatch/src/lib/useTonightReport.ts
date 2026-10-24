import { useCallback, useEffect, useState } from 'react';
import { findCity, type City } from '../constants/cities';
import { scheduleTonightAlerts } from './notifications';
import { useSettings } from './settings';
import { buildTonightReport, type TonightReport } from './sky/report';

export function useTonightReport() {
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

  return { report, loading, error, refresh };
}
