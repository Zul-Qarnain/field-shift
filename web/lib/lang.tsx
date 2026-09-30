"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

export type { Lang };

const STORAGE_KEY = "fieldshift.lang";
const listeners = new Set<() => void>();

const readLang = (): Lang => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
};

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
};

const getServerSnapshot = (): Lang => "en";

export const setLang = (lang: Lang) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked (private mode): the toggle still works for this page load.
  }
  listeners.forEach((onChange) => onChange());
};

export const usePersistedLang = () => {
  const lang = useSyncExternalStore(subscribe, readLang, getServerSnapshot);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return useMemo(() => ({ lang, setLang }), [lang]);
};

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export const useLang = () => useContext(LangContext);
