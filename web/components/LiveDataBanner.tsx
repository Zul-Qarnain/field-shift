"use client";

import { RefreshCw, CloudOff } from "lucide-react";
import { useNowcast } from "@/lib/useNowcast";
import { t, tf } from "@/lib/i18n";
import { useLang } from "@/lib/lang";

/**
 * Shown when the live NASA POWER request did not answer: the saved data pack carries the numbers and
 * states its own date, so the page never goes blank and never shows an estimated value.
 */
export function LiveDataBanner({ pointId }: { pointId: string }) {
  const { lang } = useLang();
  const { status, pack, error, retry } = useNowcast(pointId);
  if (status !== "saved" && status !== "none") return null;

  return (
    <div
      role="status"
      data-testid="outage-banner"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 fade-up"
    >
      <CloudOff className="h-4 w-4 shrink-0 text-amber" />
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber">
        {status === "saved" && pack
          ? tf("outage_banner", lang, { date: pack.retrievedUtc.slice(0, 10) })
          : t("outage_banner_none", lang)}
        {error ? ` · ${tf("outage_reason", lang, { reason: error })}` : ""}
      </p>
      <button
        onClick={retry}
        data-testid="outage-retry"
        className="flex items-center gap-1.5 rounded-lg border border-amber bg-canvas px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/10"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("outage_retry", lang)}
      </button>
    </div>
  );
}
