"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Zap } from "lucide-react";
import { CROPS, cropName } from "@/lib/data";
import {
  PRIORITY_LABEL,
  QUICK_CROPS,
  QUICK_PRIORITIES,
  districtProfile,
  isCropId,
  isQuickPriority,
  quickAnswer,
  type QuickPriority,
  type SalinityJson,
} from "@/lib/quick";
import { districtBySlug } from "@/lib/locate";
import { loadDistrictPack, type PowerPack } from "@/lib/packs";
import salinityJson from "../../public/data/salinity.json";
import { useLang } from "@/lib/lang";
import { t, tf } from "@/lib/i18n";
import { Panel } from "@/components/ui";
import { DistrictSelect } from "@/components/DistrictSelect";
import { LiveDataBanner } from "@/components/LiveDataBanner";
import { NowcastCard } from "@/components/NowcastCard";
import { QuickAnswerCard } from "@/components/QuickAnswerCard";

const SALINITY = salinityJson as unknown as SalinityJson;
const DEFAULT_DISTRICT = "tangail";
const DEFAULT_CROP = "aman";
const DEFAULT_PRIORITY: QuickPriority = "balanced";

const selectClass =
  "mt-1.5 h-10 w-full rounded-lg border border-line bg-inset px-2 text-sm text-ink-hi focus:border-action focus:outline-none";

interface Choices {
  district: string;
  crop: string;
  priority: QuickPriority;
}

function QuickView({ initial, onChange }: { initial: Choices; onChange: (next: Choices) => void }) {
  const { lang } = useLang();
  const [choices, setChoices] = useState<Choices>(initial);
  const [packState, setPackState] = useState<{ slug: string; pack: PowerPack | null } | null>(null);
  const [reload, setReload] = useState(0);

  const district = districtBySlug(choices.district) ?? districtBySlug(DEFAULT_DISTRICT)!;
  const cropEntry = QUICK_CROPS.find((c) => c.id === choices.crop) ?? QUICK_CROPS[0];

  const select = (next: Partial<Choices>) => {
    const merged = { ...choices, ...next };
    setChoices(merged);
    onChange(merged);
  };

  useEffect(() => {
    let active = true;
    void loadDistrictPack(district.slug).then((resolved) => {
      if (active) setPackState({ slug: district.slug, pack: resolved });
    });
    return () => {
      active = false;
    };
  }, [district.slug, reload]);

  const settled = packState?.slug === district.slug ? packState : null;
  const loaded = settled !== null;
  const pack = settled?.pack ?? null;

  const profile = useMemo(() => districtProfile(district, pack, SALINITY), [district, pack]);
  const answers = useMemo(
    () => quickAnswer(profile.pack, cropEntry.id, choices.priority),
    [profile.pack, cropEntry.id, choices.priority],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
        <Zap className="h-6 w-6 text-lime" /> {t("nav_quick", lang)}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-mid">{t("quick_intro", lang)}</p>

      <div className="mt-4"><LiveDataBanner pointId={district.slug} /></div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Panel title={t("locate_district_label", lang)}>
          <DistrictSelect value={district.slug} onChange={(slug) => select({ district: slug })} testId="quick-district" />
        </Panel>
        <Panel title={t("quick_crop_label", lang)}>
          <select
            className={selectClass}
            data-testid="quick-crop"
            aria-label={t("quick_crop_label", lang)}
            value={cropEntry.id}
            onChange={(event) => select({ crop: event.target.value })}
          >
            {QUICK_CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {cropName(c, lang)}
              </option>
            ))}
          </select>
        </Panel>
        <Panel title={t("quick_priority_label", lang)}>
          <div data-testid="quick-priority" role="group" className="mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_PRIORITIES.map((key) => (
              <button
                key={key}
                data-testid={`quick-priority-${key}`}
                aria-pressed={key === choices.priority}
                onClick={() => select({ priority: key })}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  key === choices.priority ? "border-action bg-action/15 text-ink-hi" : "border-line bg-inset text-ink-mid hover:text-ink-hi"
                }`}
              >
                {t(PRIORITY_LABEL[key], lang)}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {!loaded ? (
        <Panel className="mt-5">
          <div className="flex flex-col gap-2" aria-busy="true">
            <p className="text-xs text-ink-low">{t("loading_plan", lang)}</p>
            <div className="h-20 w-full animate-pulse rounded-lg bg-inset" />
            <div className="h-20 w-2/3 animate-pulse rounded-lg bg-inset" />
          </div>
        </Panel>
      ) : !pack ? (
        <Panel className="mt-5">
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber/40 bg-amber/10 p-3">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber">{t("quick_pack_missing", lang)}</p>
            <button
              onClick={() => setReload((n) => n + 1)}
              data-testid="quick-pack-retry"
              className="flex items-center gap-1.5 rounded-lg border border-amber bg-canvas px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("outage_retry", lang)}
            </button>
          </div>
        </Panel>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <h2 className="font-display text-xl font-bold">
            {tf("quick_top", lang, { n: answers.length, crop: cropName(cropEntry, lang) })}
          </h2>
          {answers.length > 0 && answers.length < 3 && (
            <p className="text-[11px] leading-relaxed text-amber">
              {tf("quick_fewer", lang, { n: answers.length, crop: cropName(cropEntry, lang) })}
            </p>
          )}
          {answers.length === 0 && (
            <Panel>
              <p className="text-sm leading-relaxed text-ink-mid">{tf("quick_none", lang, { crop: cropName(cropEntry, lang) })}</p>
            </Panel>
          )}
          {answers.map((result, i) => (
            <QuickAnswerCard key={result.id} result={result} rank={i + 1} profile={profile} pack={pack} />
          ))}
          <p className="text-[11px] leading-relaxed text-ink-low">
            {tf("plan_from_crops", lang, { c: CROPS.length, k: answers.length })} · {t("quick_next_phase", lang)}
          </p>
        </div>
      )}

      <div className="mt-6"><NowcastCard pointId={district.slug} label={lang === "bn" ? district.name_bn : district.name_en} /></div>
    </div>
  );
}

function QuickInner() {
  const params = useSearchParams();
  const districtParam = params.get("district");
  const cropParam = params.get("crop");
  const priorityParam = params.get("priority");
  const fromUrl: Choices = {
    district: districtBySlug(districtParam ?? "")?.slug ?? DEFAULT_DISTRICT,
    crop: isCropId(cropParam) ? cropParam! : DEFAULT_CROP,
    priority: isQuickPriority(priorityParam) ? priorityParam : DEFAULT_PRIORITY,
  };
  const [current, setCurrent] = useState<Choices>(fromUrl);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `/quick?district=${current.district}&crop=${current.crop}&priority=${current.priority}`,
    );
  }, [current]);

  return <QuickView initial={fromUrl} onChange={setCurrent} />;
}

export default function QuickPage() {
  const { lang } = useLang();
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-low">{t("loading_plan", lang)}</div>}>
      <QuickInner />
    </Suspense>
  );
}
