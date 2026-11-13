"use client";

import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  Home, 
  Sprout, 
  CalendarRange, 
  BookOpen, 
  Database, 
  Search, 
  MapPin, 
  Zap, 
  FileText, 
  Sun, 
  Moon, 
  Globe, 
  Menu, 
  X, 
  Smartphone,
  Download
} from "lucide-react";
import { LangContext, usePersistedLang, type Lang } from "@/lib/lang";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { fmtNum, t } from "@/lib/i18n";
import { FARMS, districtName, divisionName, farmName } from "@/lib/data";
import { ChatWidget } from "@/components/ChatWidget";

const NAV: { href: string; key: Parameters<typeof t>[0]; icon: typeof Home }[] = [
  { href: "/", key: "nav_home", icon: Home },
  { href: "/quick", key: "nav_quick", icon: Zap },
  { href: "/field", key: "nav_field", icon: Sprout },
  { href: "/plan", key: "nav_plan", icon: CalendarRange },
  { href: "/locate", key: "nav_locate", icon: MapPin },
  { href: "/docs", key: "nav_docs", icon: FileText },
  { href: "/method", key: "nav_method", icon: BookOpen },
  { href: "/data", key: "nav_data", icon: Database },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
  } catch {
    return false;
  }
}

function InstallBanner() {
  const { lang } = useContext(LangContext);
  const bn = lang === "bn";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState<boolean>(() => isIosDevice() && !isStandaloneMode());
  const [installed, setInstalled] = useState<boolean>(isStandaloneMode);
  const [isIos] = useState<boolean>(isIosDevice);

  useEffect(() => {
    if (installed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!isIos) {
      // Auto prompt banner on mobile / desktop after a short moment
      timer = setTimeout(() => {
        if (!window.matchMedia("(display-mode: standalone)").matches) {
          setShow(true);
        }
      }, 1200);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [installed, isIos]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setInstalled(true);
        setShow(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      alert(
        bn
          ? "আইফোনে অ্যাপ ইনস্টল করতে: ব্রাউজারের নিচে Share (⎋) বাটনে ট্যাপ করে 'Add to Home Screen' চাপুন।"
          : "To install on iOS: Tap Share (⎋) at the bottom and select 'Add to Home Screen'."
      );
    } else {
      alert(
        bn
          ? "অ্যাপটি ইনস্টল করতে আপনার ব্রাউজারের উপরের মেনু (⋮) থেকে 'Install App' বা 'Add to Home Screen' চাপুন।"
          : "To install: Tap your browser menu (⋮) and select 'Install app' or 'Add to Home Screen'."
      );
    }
  };

  if (!show || installed) return null;

  return (
    <div className="relative z-50 flex items-center justify-between gap-3 border-b border-action/40 bg-gradient-to-r from-action/20 via-surface to-action/10 px-4 py-2 text-xs text-ink-hi backdrop-blur shadow-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-action text-white text-sm shadow-sm">
          📱
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink-hi truncate text-xs">
            {bn ? "Field Shift মোবাইল অ্যাপ (PWA)" : "Install Field Shift App"}
          </p>
          <p className="text-[11px] text-ink-mid truncate">
            {bn ? "অফলাইন ব্যবহার ও দ্রুত কৃষক পরামর্শের জন্য ইনস্টল করুন" : "Install for instant offline access and SMS alerts"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-95"
        >
          <Download size={13} />
          <span>{bn ? "ইনস্টল করুন" : "Install"}</span>
        </button>
        <button
          onClick={() => setShow(false)}
          className="rounded-lg p-1 text-ink-low hover:bg-surface hover:text-ink-hi"
          aria-label="Dismiss banner"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const { lang } = useContext(LangContext);
  const bn = lang === "bn";
  const farm = params.get("farm");
  const hrefFor = (href: string) =>
    farm && (href === "/field" || href === "/plan") ? `${href}?farm=${encodeURIComponent(farm)}` : href;

  const items = [
    { href: "/", label: bn ? "হোম" : "Home", icon: Home },
    { href: "/quick", label: bn ? "দ্রুত উত্তর" : "Quick", icon: Zap },
    { href: "/field", label: bn ? "মাঠ" : "Field", icon: Sprout },
    { href: "/plan", label: bn ? "পরিকল্পনা" : "Plan", icon: CalendarRange },
    { href: "/docs", label: bn ? "গাইড" : "Docs", icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 flex h-14 items-center justify-around border-t border-line bg-surface/95 px-1 backdrop-blur lg:hidden shadow-lg">
      {items.map((it) => {
        const dest = hrefFor(it.href);
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={dest}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] transition-all ${
              active ? "text-action font-bold" : "text-ink-mid hover:text-ink-hi"
            }`}
          >
            <it.icon className={`h-4.5 w-4.5 ${active ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function LangToggle() {
  const { lang, setLang } = useContext(LangContext);
  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-line bg-surface/90 p-0.5 text-xs font-medium shadow-sm">
      <Globe className="hidden sm:inline-block ml-1 h-3.5 w-3.5 text-action" />
      <button
        onClick={() => setLang("bn")}
        className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
          lang === "bn"
            ? "bg-action text-white shadow-sm"
            : "text-ink-mid hover:text-ink-hi"
        }`}
        title="বাংলা ভাষায় দেখুন"
      >
        বাং
      </button>
      <button
        onClick={() => setLang("en")}
        className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
          lang === "en"
            ? "bg-action text-white shadow-sm"
            : "text-ink-mid hover:text-ink-hi"
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light theme (লাইট থিম)" : "Switch to dark theme (ডার্ক থিম)"}
      className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface/80 text-ink-mid transition-all hover:bg-elevated hover:text-ink-hi"
    >
      {theme === "dark" ? <Sun className="h-4 w-4 text-amber" /> : <Moon className="h-4 w-4 text-action" />}
    </button>
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
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-low" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search_ph", lang)}
        className="h-9 sm:h-10 w-full rounded-lg border border-line bg-inset pl-9 pr-3 text-xs sm:text-sm text-ink-hi placeholder:text-ink-low focus:border-action focus:outline-none"
      />
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-line bg-elevated shadow-drawer">
          {results.map((f) => (
            <Link
              key={f.id}
              href={`/field?farm=${f.id}`}
              onClick={() => setQ("")}
              className="flex items-center justify-between px-3 py-2 text-xs text-ink-mid hover:bg-surface hover:text-ink-hi"
            >
              <span>
                <span className="font-semibold">{farmName(f, lang)}</span>
                <span className="ml-2 text-ink-low">{districtName(f, lang)}</span>
              </span>
              <span className="text-[10px] text-ink-low font-mono">{fmtNum(f.lat.toFixed(2), lang)}°N</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinks({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { lang } = useContext(LangContext);
  const farm = params.get("farm");
  const hrefFor = (href: string) =>
    farm && (href === "/field" || href === "/plan") ? `${href}?farm=${encodeURIComponent(farm)}` : href;
  return (
    <>
      {NAV.map(({ href, key, icon: Icon }) => {
        const hrefWithFarm = hrefFor(href);
        const active = pathname === href;
        return (
          <Link
            key={key}
            href={hrefWithFarm}
            onClick={onNavClick}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-action text-white" : "text-ink-mid hover:bg-surface hover:text-ink-hi"
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            {t(key, lang)}
          </Link>
        );
      })}
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const langValue = usePersistedLang();
  const { lang } = langValue;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ThemeProvider>
    <LangContext.Provider value={langValue}>
      <InstallBanner />
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
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
            <Suspense>
              <NavLinks />
            </Suspense>
          </nav>
          <div className="mt-auto px-5 pb-6">
            <div className="mb-3 rounded-xl border border-line bg-inset/80 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-ink-hi">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-action/20 text-action text-xs">📱</span>
                <span>{lang === "bn" ? "অ্যান্ড্রয়েড অ্যাপ (PWA)" : "Android Farmer App"}</span>
              </div>
              <p className="mt-1 text-[11px] text-ink-low leading-relaxed">
                {lang === "bn"
                  ? "মোবাইলে সরাসরি ইনস্টল করুন — অফলাইন মোডেও পরামর্শ দেখুন।"
                  : "Install on mobile — view crop plans and SMS advice even offline."}
              </p>
            </div>
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

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0 overflow-x-hidden">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-canvas/90 px-3 py-2.5 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg border border-line bg-surface p-1.5 text-ink-mid lg:hidden hover:text-ink-hi"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <Link href="/" className="font-display text-sm sm:text-base font-bold whitespace-nowrap">
                FIELD <span className="text-lime">SHIFT</span>
              </Link>
            </div>

            <div className="hidden sm:block flex-1 max-w-xs md:max-w-md mx-2">
              <SearchBox />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-2.5 py-1 text-xs font-medium text-lime md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
                <span className="text-[10px] font-mono font-semibold tracking-wide">NASA LIVE DATA</span>
              </span>
              <LangToggle />
              <ThemeToggle />
            </div>
          </header>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-x-0 top-12 z-40 max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-line bg-surface p-4 shadow-2xl backdrop-blur-md">
              <div className="mb-4">
                <SearchBox />
              </div>
              <nav className="flex flex-col gap-1">
                <Suspense>
                  <NavLinks onNavClick={() => setMobileMenuOpen(false)} />
                </Suspense>
              </nav>
            </div>
          )}

          <main className="flex-1 w-full min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <Suspense>
        <MobileNav />
      </Suspense>

      {/* AI Assistant Chat Widget */}
      <ChatWidget />
    </LangContext.Provider>
    </ThemeProvider>
  );
}
