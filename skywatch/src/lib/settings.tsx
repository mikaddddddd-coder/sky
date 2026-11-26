import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultCityIds, type City } from '../constants/cities';
import { toSimplified } from './i18n/hanzi';
import type { Birth } from './sky/birth';
import { translate, type Lang, type StringKey } from './i18n/strings';

export type Settings = {
  language: 'system' | Lang;
  cityIds: string[];
  /** Cities added by search or from the device location, kept so they survive restarts. */
  customCities: City[];
  /**
   * `feedback` is the after-sunset question and `island` the Dynamic Island countdown; either is
   * missing in settings saved before it existed, which counts as on.
   */
  alerts: { glow: boolean; sky: boolean; feedback?: boolean; island?: boolean };
  /** Which glows earn an alert, and how long before sunset the first one comes. */
  glowAlert: GlowAlert;
  /** For the birth-sky tab. Kept only on this phone, never sent anywhere. */
  birth: Birth | null;
};

/**
 * How many cities can be followed at once. Each brings a handful of alerts and iOS keeps at most
 * 64 pending, so this also keeps them all scheduled.
 */
export const MAX_CITIES = 5;

export type GlowAlert = { level: 'fire' | 'good'; leadMin: 60 | 120 | 180 };
const DEFAULT_GLOW_ALERT: GlowAlert = { level: 'fire', leadMin: 120 };

const DEFAULTS: Settings = {
  language: 'system',
  cityIds: defaultCityIds(systemLang()),
  customCities: [],
  alerts: { glow: true, sky: true, feedback: true, island: true },
  glowAlert: DEFAULT_GLOW_ALERT,
  birth: null,
};

const STORAGE_KEY = 'skywatch.settings.v1';

type SettingsContextValue = {
  settings: Settings;
  /**
   * False until the saved settings are read. Until then `settings` holds the defaults, so
   * nothing should be fetched, scheduled or saved on their behalf.
   */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  lang: Lang;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function systemLang(): Lang {
  return getLocales()[0]?.languageCode === 'zh' ? 'zh' : 'en';
}

export const resolveLang = (s: Settings): Lang => (s.language === 'system' ? systemLang() : s.language);

/** The saved settings, read straight from storage, for work done outside the app's screens. */
export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  const saved = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  return { ...saved, customCities: saved.customCities.map(simplifyCity) };
}

/** Cities saved before search simplified their names may still carry traditional ones. */
const simplifyCity = (c: City): City => ({
  ...c,
  name: { ...c.name, zh: toSimplified(c.name.zh) },
  region: c.region && toSimplified(c.region),
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const lang = resolveLang(settings);
    return { settings, ready, update, lang, t: (key, vars) => translate(lang, key, vars) };
  }, [settings, ready, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
