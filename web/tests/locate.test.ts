import { describe, expect, it } from "vitest";
import {
  DISTRICTS,
  PRECOMPUTED_POINTS,
  districtBySlug,
  districtSlugForFarmId,
  haversineKm,
  inBangladeshBBox,
  nearestPoint,
} from "@/lib/locate";
import { FARMS } from "@/lib/data";

const DHAKA = { lat: 23.7806, lon: 90.3583 };
const CHATTOGRAM = { lat: 22.3569, lon: 91.8319 };

describe("haversineKm", () => {
  it("puts Dhaka and Chattogram 200–260 km apart", () => {
    const km = haversineKm(DHAKA, CHATTOGRAM);
    expect(km).toBeGreaterThan(200);
    expect(km).toBeLessThan(260);
  });

  it("is 0 for the same point and symmetric", () => {
    expect(haversineKm(DHAKA, DHAKA)).toBe(0);
    expect(haversineKm(DHAKA, CHATTOGRAM)).toBeCloseTo(haversineKm(CHATTOGRAM, DHAKA), 6);
  });
});

describe("the precomputed point set", () => {
  it("carries the six demo farms and the 64 district pack points", () => {
    expect(FARMS).toHaveLength(6);
    expect(DISTRICTS).toHaveLength(64);
    expect(PRECOMPUTED_POINTS).toHaveLength(70);
    expect(PRECOMPUTED_POINTS.filter((p) => p.kind === "farm")).toHaveLength(6);
    expect(PRECOMPUTED_POINTS.filter((p) => p.kind === "district")).toHaveLength(64);
    expect(new Set(PRECOMPUTED_POINTS.map((p) => p.id)).size).toBe(70);
    for (const point of PRECOMPUTED_POINTS) {
      expect(point.name_en.length).toBeGreaterThan(0);
      expect(point.name_bn.length).toBeGreaterThan(0);
      expect(inBangladeshBBox(point.lat, point.lon)).toBe(true);
    }
  });

  it("keys the districts by slug and reads both names", () => {
    const tangail = districtBySlug("tangail");
    expect(tangail?.name_bn.length).toBeGreaterThan(0);
    expect(districtBySlug("no-such-district")).toBeUndefined();
  });
});

describe("nearestPoint", () => {
  it("brings every district centroid within 60 km of a point that has data", () => {
    for (const district of DISTRICTS) {
      const match = nearestPoint(district.centroid.lat, district.centroid.lon);
      expect(match.distanceKm, `${district.slug} centroid`).toBeLessThan(60);
    }
  });

  it("snaps a district's own pack point back to itself at 0 km", () => {
    for (const district of DISTRICTS) {
      const match = nearestPoint(district.point.lat, district.point.lon);
      expect(match.point.id, `${district.slug} point`).toBe(district.slug);
      expect(match.distanceKm).toBeLessThan(1e-6);
    }
  });

  it("snaps each demo farm onto itself", () => {
    for (const farm of FARMS) {
      expect(nearestPoint(farm.lat, farm.lon).point.id).toBe(farm.id);
    }
  });
});

describe("inBangladeshBBox", () => {
  it("accepts the country and rejects a point north of it", () => {
    expect(inBangladeshBBox(DHAKA.lat, DHAKA.lon)).toBe(true);
    expect(inBangladeshBBox(28, 90)).toBe(false);
    expect(inBangladeshBBox(23.78, 93.5)).toBe(false);
    expect(inBangladeshBBox(19.9, 90)).toBe(false);
  });
});

describe("farm → district join", () => {
  it("links every demo farm to the district the geoBoundaries register carries", () => {
    for (const farm of FARMS) {
      expect(districtSlugForFarmId(farm.id), farm.id).not.toBeNull();
    }
    expect(districtSlugForFarmId("barishal-03")).toBe("barisal");
    expect(districtSlugForFarmId("tangail-not-a-farm")).toBeNull();
  });
});
