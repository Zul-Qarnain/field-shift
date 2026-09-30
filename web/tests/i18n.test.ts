import { describe, expect, it } from "vitest";
import { fmtNum, soilTextureLabel, t, tf, toBnDigits } from "@/lib/i18n";

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
