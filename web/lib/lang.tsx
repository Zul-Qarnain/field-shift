"use client";

import { createContext, useContext } from "react";
import type { Lang } from "./i18n";

export type { Lang };

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export const useLang = () => useContext(LangContext);
