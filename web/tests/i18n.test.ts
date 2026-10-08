import { describe, expect, it } from "vitest";
import { STRING_KEYS, fmtNum, soilTextureLabel, t, tf, toBnDigits } from "@/lib/i18n";

/** Bengali digits back to Latin, so a test can compare the value behind the glyphs. */
const latinize = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

describe("Bangla digits", () => {
  it("maps every Latin digit to its Bengali twin", () => {
    expect(toBnDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });

  it("leaves signs, decimals, separators and words untouched", () => {
    expect(toBnDigits(-7.5)).toBe("-৭.৫");
    expect(toBnDigits("2001–2012")).toBe("২০০১–২০১২");
    expect(toBnDigits("pH 6.3, 100%")).toBe("pH ৬.৩, ১০০%");
    expect(toBnDigits("FAO-56")).toBe("FAO-৫৬");
  });

  it("writes Latin digits in English mode and Bengali digits in Bangla mode", () => {
    expect(fmtNum(42, "en")).toBe("42");
    expect(fmtNum("3.5", "en")).toBe("3.5");
    expect(fmtNum(42, "bn")).toBe("৪২");
    expect(fmtNum("0.8", "bn")).toBe("০.৮");
  });

  it("keeps the value while changing only the glyphs", () => {
    for (const value of [0, 7, 12.5, -3, 100, 0.8, 0.011]) {
      expect(Number(latinize(fmtNum(value, "bn")))).toBe(value);
    }
  });

  it("interpolates placeholder numbers in the language's own digits", () => {
    expect(tf("plan_valid_rotations", "bn", { n: 24 })).toBe("২৪টি বৈধ ফসল-পর্যায়");
    expect(tf("plan_valid_rotations", "en", { n: 24 })).toBe("24 valid rotations");
    expect(tf("unc_ndvi_years", "bn", { n: 24 })).toBe("NDVI রেকর্ড: ২৪ বছর");
    expect(tf("plan_irrigation_note", "bn", { n: 0.6 }).includes("০.৬")).toBe(true);
    expect(tf("card_sub_moisture", "bn", { n: 7 })).toBe("SMAP L4 · গত ৭ দিনের তুলনায়");
    expect(t("unc_smap_yes", "bn").includes("২০১৫")).toBe(true);
  });

  it("names the soil textures in Bangla and falls back to the stored label", () => {
    expect(soilTextureLabel("Silty Clay Loam", "bn")).toBe("পলল-এঁটে-দোঁশ");
    expect(soilTextureLabel("Loam", "bn")).toBe("দোঁশ");
    expect(soilTextureLabel("Loam", "en")).toBe("Loam");
    expect(soilTextureLabel("Vertisol", "bn")).toBe("Vertisol");
  });
});

/** The project owner's wording rule: confident and forward-looking, and never a placeholder number. */
describe("the string table", () => {
  const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  /** Anything that reads as an apology for the build rather than a statement of what it does. */
  const APOLOGETIC = /(not yet|NOT YET|does not beat|lacking|\bweak\b|limitation|fail)/;

  it("carries a non-empty English and Bangla form for every key the interface reads", () => {
    expect(STRING_KEYS.length).toBeGreaterThan(100);
    for (const key of STRING_KEYS) {
      expect(t(key, "en").trim().length, `${key} en`).toBeGreaterThan(0);
      expect(t(key, "bn").trim().length, `${key} bn`).toBeGreaterThan(0);
    }
  });

  it("keeps the same placeholder slots in both languages", () => {
    for (const key of STRING_KEYS) {
      expect(slots(t(key, "bn")), key).toBe(slots(t(key, "en")));
    }
  });

  it("speaks about the next phase instead of what is missing", () => {
    for (const key of STRING_KEYS) {
      const text = `${t(key, "en")} ${t(key, "bn")}`;
      expect(APOLOGETIC.test(text), `${key}: ${text.slice(0, 80)}`).toBe(false);
    }
  });

  it("presents the ML monsoon forecast as built, with its training data, and never as a winner", () => {
    expect(t("ml_heading", "en")).toBe("Machine-learning monsoon forecast");
    for (const lang of ["en", "bn"] as const) {
      const trained = t("ml_trained_on", lang);
      expect(trained).toContain("CHIRPS");
      expect(trained).toContain("NASA POWER");
    }
    const ML_KEYS = STRING_KEYS.filter((key) => key.startsWith("ml_") && key !== "ml_shipped_note");
    for (const key of ML_KEYS) {
      const text = `${t(key, "en")} ${t(key, "bn")}`;
      expect(/(experimental|in training|next phase|পরবর্তী ধাপ|প্রশিক্ষণ চলছে|পরীক্ষামূলক)/i.test(text), key).toBe(false);
      expect(/(beats|outperform|ছাড়িয়েছে)/i.test(text), key).toBe(false);
    }
  });

  it("fills every slot with the language's own digits", () => {
    for (const key of STRING_KEYS) {
      const names = [...t(key, "en").matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      if (names.length === 0) continue;
      const vars = Object.fromEntries(names.map((name) => [name, 7.5]));
      expect(tf(key, "bn", vars).includes("৭.৫"), key).toBe(true);
      expect(tf(key, "en", vars).includes("7.5"), key).toBe(true);
    }
  });
});
