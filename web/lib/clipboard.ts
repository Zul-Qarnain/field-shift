"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

/** The only part of the Clipboard API this app uses — also what the tests hand in. */
export interface ClipboardLike {
  writeText(text: string): Promise<void>;
}

/**
 * Copy and report what actually happened. `copied` is returned only once writeText has resolved;
 * a refused permission, a thrown rejection or no clipboard at all (insecure context, old browser)
 * returns `failed`. The promise is always awaited, so nothing rejects unhandled.
 */
export async function copyToClipboard(text: string, clipboard: ClipboardLike | undefined): Promise<CopyState> {
  if (!clipboard) return "failed";
  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/** One behaviour for every copy button: honest state, then back to idle after `resetMs`. */
export function useCopy(resetMs = 1600) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      const result = await copyToClipboard(text, navigator.clipboard);
      if (!mounted.current) return result;
      setState(result);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), resetMs);
      return result;
    },
    [resetMs],
  );

  return { state, copy };
}
