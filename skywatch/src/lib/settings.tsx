import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY_IDS } from '../constants/cities';
import { translate, type Lang, type StringKey } from './i18n/strings';

export type Settings = {
  language: 'system' | Lang;
  cityIds: string[];
  alerts: { glow: boolean; sky: boolean; typhoon: boolean };
};

const DEFAULTS: Settings = {
  language: 'system',
  cityIds: DEFAULT_CITY_IDS,
  alerts: { glow: true, sky: true, typhoon: true },
};

const STORAGE_KEY = 'skywatch.settings.v1';

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  lang: Lang;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemLang(): Lang {
  return getLocales()[0]?.languageCode === 'zh' ? 'zh' : 'en';
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }))
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const lang = settings.language === 'system' ? systemLang() : settings.language;
    return { settings, update, lang, t: (key, vars) => translate(lang, key, vars) };
  }, [settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
