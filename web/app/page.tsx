"use client";

import Link from "next/link";
import { ArrowRight, Droplets, MapPin, Sprout, Thermometer, TrendingDown, Zap } from "lucide-react";
import { FARMS, districtName, divisionName, farmContext, farmName } from "@/lib/data";
import { withRealData } from "@/lib/packs";
import { onsetShiftSignificant } from "@/lib/engine";
import { useLang } from "@/lib/lang";
import { fmtNum, t } from "@/lib/i18n";
import { Panel, SourceChip } from "@/components/ui";

export default function Home() {
  const { lang } = useLang();
  const FEATURES = [
    { icon: TrendingDown, title: t("feat_shifted_title", lang), body: t("feat_shifted_body", lang) },
    { icon: Sprout, title: t("feat_plant_title", lang), body: t("feat_plant_body", lang) },
    { icon: Droplets, title: t("feat_whatif_title", lang), body: t("feat_whatif_body", lang) },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      <section className="fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime">
          NASA Space Apps Challenge 2026 · Field Shift
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight lg:text-6xl">
          {t("hero_line1", lang)}
          <br />
          <span className="text-lime">{t("hero_line2", lang)}</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-mid lg:text-lg">{t("hero_intro", lang)}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/field?farm=farm-12"
            className="flex items-center gap-2 rounded-lg bg-lime px-5 py-3 text-sm font-bold text-canvas transition-transform hover:-translate-y-0.5"
          >
            {t("cta_open_farm", lang)} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/plan"
            className="flex items-center gap-2 rounded-lg border border-action px-5 py-3 text-sm font-semibold text-link transition-colors hover:bg-action/10"
          >
            {t("cta_plan_rotation", lang)}
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-low">{t("home_entry_heading", lang)}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            { href: "/quick", icon: Zap, title: t("nav_quick", lang), body: t("home_quick_body", lang), cta: t("nav_quick", lang) },
            { href: "/locate", icon: MapPin, title: t("nav_locate", lang), body: t("home_locate_body", lang), cta: t("nav_locate", lang) },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              data-testid={`home-entry-${card.href.replace("/", "")}`}
              className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-lime"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/15">
                <card.icon className="h-5 w-5 text-lime" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{card.body}</p>
              <span className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-link transition-colors group-hover:text-lime">
                {card.cta} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-low">{t("farms_heading", lang)}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FARMS.map((base) => {
            const f = withRealData(base);
            return (
            <Link
              key={f.id}
              href={`/field?farm=${f.id}`}
              className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-action"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-base font-bold">{farmName(f, lang)}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-low">
                    <MapPin className="h-3 w-3" /> {districtName(f, lang)}, {divisionName(f, lang)}
                  </p>
                </div>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-mid">{farmContext(f, lang)}</span>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs">
                <span className={`tabular font-semibold ${onsetShiftSignificant(f) ? (f.onset.shiftDays > 0 ? "text-amber" : "text-lime") : "text-ink-mid"}`}>
                  {t("card_onset", lang)} {f.onset.shiftDays > 0 ? "+" : ""}{fmtNum(f.onset.shiftDays, lang)} {t("unit_days_short", lang)}
                  {!onsetShiftSignificant(f) && <span className="ml-1 font-normal">({t("ns_short", lang)})</span>}
                </span>
                <span className="flex items-center gap-1 text-ink-mid"><Droplets className="h-3.5 w-3.5 text-water" />{fmtNum(f.metrics.soilMoisturePct, lang)}%</span>
                <span className="flex items-center gap-1 text-ink-mid"><Thermometer className="h-3.5 w-3.5 text-risk" />{fmtNum(f.metrics.heatDays, lang)} {t("unit_heat_days", lang)}</span>
                <span className="ml-auto text-ink-low transition-colors group-hover:text-link"><ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {FEATURES.map((c) => (
          <Panel key={c.title}>
            <c.icon className="h-5 w-5 text-lime" />
            <h3 className="mt-3 font-display text-base font-bold">{c.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">{c.body}</p>
          </Panel>
        ))}
      </section>

      <p className="mt-10 flex items-center gap-2 text-xs text-ink-low">
        <SourceChip source="fixture" />
        {t("generated_fixtures", lang)}
      </p>
    </div>
  );
}
