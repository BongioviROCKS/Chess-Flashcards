import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

export type Settings = {
  theme: Theme;
  frontStartAtReview: boolean;
  boardHoldStepsPerSecond: number;

  // Card creation settings
  otherAnswersAcceptance: number; // pawns
  maxOtherAnswerCount: number;
  stockfishDepth: number;
  stockfishThreads: number;
  stockfishHash: number;
  // Accounts
  chessComUser?: string;
  lichessUser?: string;
};

const DEFAULTS: Settings = {
  theme: 'dark',
  frontStartAtReview: false,
  boardHoldStepsPerSecond: 2.7,

  otherAnswersAcceptance: 0.20,
  maxOtherAnswerCount: 4,
  stockfishDepth: 25,
  stockfishThreads: 1,
  stockfishHash: 1024,
  chessComUser: '',
  lichessUser: '',
};

const KEY = 'chessflashcards.settings.v1';

type LegacySettings = Partial<Settings> & {
  boardHoldSpeed?: number;
};

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as LegacySettings;
    const merged: Settings = { ...DEFAULTS, ...parsed } as Settings;

    if (typeof parsed.boardHoldStepsPerSecond !== 'number') {
      if (typeof parsed.boardHoldSpeed === 'number') {
        const level = Math.min(10, Math.max(0, parsed.boardHoldSpeed));
        const converted = level <= 0 ? 0 : Math.round((0.5 * Math.pow(1.4, level - 1)) * 10) / 10;
        merged.boardHoldStepsPerSecond = converted;
      } else {
        merged.boardHoldStepsPerSecond = DEFAULTS.boardHoldStepsPerSecond;
      }
    } else {
      const rate = parsed.boardHoldStepsPerSecond;
      const clamped = Math.max(0, Math.min(20, Math.round(rate * 10) / 10));
      merged.boardHoldStepsPerSecond = clamped;
    }

    return merged;
  } catch {
    return DEFAULTS;
  }
}

function save(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

const Ctx = createContext<{
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => load());

  // Apply theme immediately on mount and whenever it changes
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  };

  const value = useMemo(() => ({ settings, update }), [settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
