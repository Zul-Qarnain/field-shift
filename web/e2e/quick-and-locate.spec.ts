import { expect, test } from "@playwright/test";
import { km1, nearestPoint } from "../lib/locate";
import { mockPowerOk } from "./helpers";

/** The equation line reads "Σ parts 72.4 − penalties 6.8 + credit 0.0 = 65.6" in English. */
const equationNumbers = (text: string): number[] => (text.match(/-?\d+\.\d/g) ?? []).map(Number);

test.beforeEach(async ({ page }) => {
  await mockPowerOk(page);
});

test("quick answer ranks Satkhira, and every score adds up to its own total", async ({ page }) => {
  await page.goto("/quick");
  await page.getByTestId("quick-district").selectOption("satkhira");
  await page.getByTestId("quick-crop").selectOption("aman");
  await page.getByTestId("quick-priority-water").click();

  await expect(page).toHaveURL(/district=satkhira/);
  const cards = page.getByTestId("quick-result");
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  let firstPenalty = 0;
  for (let i = 0; i < count; i += 1) {
    const equation = (await cards.nth(i).getByTestId("score-equation").textContent()) ?? "";
    const numbers = equationNumbers(equation);
    expect(numbers, `card ${i}: ${equation}`).toHaveLength(4);
    const [parts, penalties, credit, total] = numbers;
    expect(parts).toBeGreaterThan(0);
    expect(parts - penalties + credit).toBeCloseTo(total, 1);
    if (i === 0) firstPenalty = penalties;
  }

  await cards.first().getByTestId("see-why").click();
  await expect(cards.first()).toContainText("Water adequacy");
  await expect(cards.first()).toContainText("×");
  await expect(cards.first()).toContainText("Inputs used");
  await expect(cards.first()).toContainText("km");
  if (firstPenalty > 0) await expect(cards.first()).toContainText("Penalties");

  await page.getByTestId("quick-priority-stability").click();
  await expect(page).toHaveURL(/priority=stability/);
  await expect(cards.first()).toBeVisible();
});

test("choosing a district on /locate uses that district's own data point", async ({ page }) => {
  await page.goto("/locate");
  await page.getByTestId("district-select").selectOption("sylhet");

  const snap = page.getByTestId("snap-result");
  await expect(snap).toContainText("Using precomputed point: Sylhet");
  await expect(snap).toContainText("district data pack");
  await expect(snap).toContainText(/km from your pick/);
  await expect(snap).toContainText("uses that district");
  await expect(page).toHaveURL(/district=sylhet/);
  await expect(page.getByTestId("nowcast-card")).toBeVisible();
});

test("a coordinate inside Bangladesh snaps to the nearest precomputed point", async ({ page }) => {
  const lat = 23.5389;
  const lon = 90.0919;
  const expected = nearestPoint(lat, lon);
  await page.goto(`/locate?lat=${lat}&lon=${lon}`);

  const snap = page.getByTestId("snap-result");
  await expect(snap).toContainText(`Using precomputed point: ${expected.point.name_en}`);
  await expect(snap).toContainText(`${km1(expected.distanceKm)} km from your pick`);
});

test("a point outside Bangladesh is stated and never snapped", async ({ page }) => {
  await page.goto("/locate?lat=28&lon=90");
  const snap = page.getByTestId("snap-result");
  await expect(snap).toContainText("outside Bangladesh");
  await expect(snap).not.toContainText("Using precomputed point");
  await expect(page.getByTestId("nowcast-card")).toHaveCount(0);
});

test("clicking the map picks a point — when the basemap actually loads", async ({ page }) => {
  await page.goto("/locate");
  const map = page.getByTestId("locate-map");
  await expect(map).toBeVisible();

  let phase = await map.getAttribute("data-phase");
  const deadline = Date.now() + 20_000;
  while (phase === "loading" && Date.now() < deadline) {
    await page.waitForTimeout(500);
    phase = await map.getAttribute("data-phase");
  }
  if (phase !== "ready") {
    test.info().annotations.push({
      type: "skipped",
      description: `OpenFreeMap basemap ended in "${phase}" (no route to the tile host here); the district-list and coordinate snapping tests above cover the pick path.`,
    });
    return;
  }

  await map.click();
  await expect(page).toHaveURL(/[?&]lat=/);
  await expect(page.getByTestId("snap-result")).toContainText("Using precomputed point");
  await expect(page.getByTestId("snap-result")).toContainText(/km from your pick/);
});
