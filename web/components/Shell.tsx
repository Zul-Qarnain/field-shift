"use client";

import { useContext, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, CalendarRange, BookOpen, Database, Search, MapPin, Zap } from "lucide-react";
import { LangContext, usePersistedLang, type Lang } from "@/lib/lang";
import { fmtNum, t } from "@/lib/i18n";
import { FARMS, districtName, divisionName, farmName } from "@/lib/data";

const NAV: { href: string; key: Parameters<typeof t>[0]; icon: typeof Home }[] = [
  { href: "/", key: "nav_home", icon: Home },
  { href: "/field", key: "nav_field", icon: Sprout },
  { href: "/plan", key: "nav_plan", icon: CalendarRange },
  { href: "/locate", key: "nav_locate", icon: MapPin },
  { href: "/quick", key: "nav_quick", icon: Zap },
  { href: "/method", key: "nav_method", icon: BookOpen },
  { href: "/data", key: "nav_data", icon: Database },
];

function LangToggle() {
  const { lang, setLang } = useContext(LangContext);
  return (
    <div className="flex items-center rounded-lg border border-line bg-inset p-0.5 text-xs font-semibold">
      {(["bn", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-md px-2.5 py-1.5 transition-colors ${lang === l ? "bg-action text-white" : "text-ink-mid hover:text-ink-hi"}`}
        >
          {l === "bn" ? "বাং" : "EN"}
        </button>
      ))}
    </div>
  );
}

function SearchBox() {
  const { lang } = useContext(LangContext);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return FARMS.filter(
      (f) =>
        f.district.toLowerCase().includes(needle) ||
        f.district_bn.includes(q) ||
        f.division.toLowerCase().includes(needle) ||
        f.division_bn.includes(q) ||
        f.name_en.toLowerCase().includes(needle) ||
        f.name_bn.includes(q)
    ).slice(0, 5);
  }, [q]);
  return (
    <div className="relative flex-1 max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-low" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search_ph", lang)}
        className="h-10 w-full rounded-lg border border-line bg-inset pl-9 pr-3 text-sm text-ink-hi placeholder:text-ink-low focus:border-action focus:outline-none"
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-line bg-elevated shadow-drawer">
          {results.map((f) => (
            <Link
              key={f.id}
              href={`/field?farm=${f.id}`}
              onClick={() => setQ("")}
              className="flex items-center justify-between px-4 py-2.5 text-sm text-ink-mid hover:bg-surface hover:text-ink-hi"
            >
              <span>
                <span className="font-semibold">{farmName(f, lang)}</span>
                <span className="ml-2 text-ink-low">{districtName(f, lang)}, {divisionName(f, lang)}</span>
              </span>
              <span className="text-xs text-ink-low font-mono">{fmtNum(f.lat.toFixed(2), lang)}°N {fmtNum(f.lon.toFixed(2), lang)}°E</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const langValue = usePersistedLang();
  const { lang } = langValue;

  return (
    <LangContext.Provider value={langValue}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-line bg-surface/60">
          <Link href="/" className="flex items-center gap-3 px-5 py-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-action to-earth text-lime">
              <Sprout className="h-5 w-5" />
            </span>
            <span>
              <span className="font-display text-lg font-bold tracking-tight">
                FIELD <span className="text-lime">SHIFT</span>
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-ink-low">
                {t("tagline", lang)}
              </span>
            </span>
          </Link>
          <nav className="flex flex-col gap-1 px-3">
            {NAV.map(({ href, key, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-action text-white" : "text-ink-mid hover:bg-surface hover:text-ink-hi"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {t(key, lang)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-5 pb-6">
            <div className="rounded-xl border border-line bg-inset p-4">
              <p className="font-display text-sm font-medium leading-snug">
                {t("shell_note_1", lang)}
                <br />
                {t("shell_note_2", lang)}
                <br />
                <span className="text-earth">{t("shell_note_3", lang)}</span>
              </p>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-low">{t("footer_line", lang)}</p>
            <p className="mt-2 font-bengali text-[11px] leading-relaxed text-ink-low">
              NASA স্পেস অ্যাপস চ্যালেঞ্জের জন্য তৈরি — একটি কমিউনিটি সায়েন্স উদ্যোগ। এটি NASA-র কোনো দাপ্তরিক পণ্য নয়।
            </p>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:px-6">
            <Link href="/" className="font-display text-base font-bold lg:hidden">
              FIELD <span className="text-lime">SHIFT</span>
            </Link>
            <SearchBox />
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-mid sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              {t("src_fixture", lang)}
            </span>
            <LangToggle />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </LangContext.Provider>
  );
}
