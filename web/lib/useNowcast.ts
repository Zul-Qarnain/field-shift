"use client";

import { useCallback, useSyncExternalStore } from "react";
import { fetchLiveRecent, loadNowcastPack, type LiveRecent, type NowcastPack } from "./nowcast";

export type NowcastStatus = "loading" | "live" | "saved" | "none";

export interface NowcastSnapshot {
  status: NowcastStatus;
  pack: NowcastPack | null;
  live: LiveRecent | null;
  error: string | null;
}

interface Entry {
  snapshot: NowcastSnapshot;
  listeners: Set<() => void>;
  started: boolean;
}

const store = new Map<string, Entry>();

const emit = (entry: Entry) => entry.listeners.forEach((onChange) => onChange());

const write = (id: string, snapshot: NowcastSnapshot) => {
  const entry = store.get(id);
  if (!entry) return;
  entry.snapshot = snapshot;
  emit(entry);
};

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One fetch per point id, shared by every card and banner on the page. */
function run(id: string) {
  const entry = store.get(id);
  if (!entry) return;
  write(id, { ...entry.snapshot, status: "loading", error: null });
  void (async () => {
    const pack = await loadNowcastPack(id);
    if (!pack) {
      write(id, { status: "none", pack: null, live: null, error: "no saved nowcast pack for this point" });
      return;
    }
    try {
      const live = await fetchLiveRecent(pack.lat, pack.lon);
      write(id, { status: "live", pack, live, error: null });
    } catch (error) {
      write(id, { status: "saved", pack, live: null, error: reason(error) });
    }
  })();
}

const acquire = (id: string): Entry => {
  const existing = store.get(id);
  if (existing) return existing;
  const entry: Entry = {
    snapshot: { status: "loading", pack: null, live: null, error: null },
    listeners: new Set(),
    started: false,
  };
  store.set(id, entry);
  return entry;
};

const snapshotOf = (id: string): NowcastSnapshot => acquire(id).snapshot;

export function useNowcast(id: string): NowcastSnapshot & { retry: () => void } {
  const subscribe = useCallback((onChange: () => void) => {
    const entry = acquire(id);
    entry.listeners.add(onChange);
    if (!entry.started) {
      entry.started = true;
      run(id);
    }
    return () => {
      entry.listeners.delete(onChange);
    };
  }, [id]);

  const getSnapshot = useCallback(() => snapshotOf(id), [id]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const retry = useCallback(() => run(id), [id]);

  return { ...snapshot, retry };
}
