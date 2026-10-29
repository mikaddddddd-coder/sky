import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY_IDS, type City } from '../constants/cities';
import { translate, type Lang, type StringKey } from './i18n/strings';

export type Settings = {
  language: 'system' | Lang;
  cityIds: string[];
  /** Cities added by search or from the device location, kept so they survive restarts. */
  customCities: City[];
  alerts: { glow: boolean; sky: boolean; typhoon: boolean };
  /**
   * Which glows earn an alert, and how long before sunset the first one comes. Members choose;
   * everyone else gets the defaults: only a 火烧云, 2 hours ahead.
   */
  glowAlert: GlowAlert;
  /** Membership unlocks the 7-day outlook and sunrise glows. Set locally until payments exist. */
  member: boolean;
  /**
   * The one 火烧云 whose shooting guide a non-member has had for free, as `kind:date`.
   * The first 火烧云 they open spends it; that same glow stays open, later ones don't.
   */
  guideTaste: string | null;
};

export type GlowAlert = { level: 'fire' | 'good'; leadMin: 60 | 120 | 180 };
export const DEFAULT_GLOW_ALERT: GlowAlert = { level: 'fire', leadMin: 120 };
/** What actually applies: a member's own choice, or the defaults for everyone else. */
export const glowAlertFor = (s: Settings): GlowAlert => (s.member ? s.glowAlert : DEFAULT_GLOW_ALERT);

const DEFAULTS: Settings = {
  language: 'system',
  cityIds: DEFAULT_CITY_IDS,
  customCities: [],
  alerts: { glow: true, sky: true, typhoon: true },
  glowAlert: DEFAULT_GLOW_ALERT,
  member: false,
  guideTaste: null,
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

export const resolveLang = (s: Settings): Lang => (s.language === 'system' ? systemLang() : s.language);

/** The saved settings, read straight from storage, for work done outside the app's screens. */
export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => {});
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
    return { settings, update, lang, t: (key, vars) => translate(lang, key, vars) };
  }, [settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
