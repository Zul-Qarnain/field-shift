import { expect, test } from "@playwright/test";
import { clearPowerMock, mockPowerDown, mockPowerOk, nowcastPack } from "./helpers";

const FARM = "farm-12";
const SAVED_DAY = nowcastPack(FARM).retrievedUtc.slice(0, 10);

/**
 * The outage path: the live request fails, the saved data pack carries the numbers and says which day
 * it was retrieved, and a Retry that finds the network again flips the card back to live.
 */
test("a blocked NASA POWER shows the banner and the saved pack's numbers", async ({ page }) => {
  await mockPowerDown(page);
  await page.goto(`/field?farm=${FARM}`);

  const banner = page.getByTestId("outage-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(SAVED_DAY);
  await expect(banner).toContainText("unavailable");

  const source = page.getByTestId("nowcast-source");
  await expect(source).toContainText("Saved");

  const card = page.getByTestId("nowcast-card");
  await expect(card).toContainText("Rain");
  await expect(card).toContainText("% of normal");
  await expect(card).toContainText(/\d/);
  await expect(card).not.toContainText("NaN");
  await expect(card).not.toContainText("undefined");
});

test("outage-retry recovers to a live card once the network answers again", async ({ page }) => {
  await mockPowerDown(page);
  await page.goto(`/field?farm=${FARM}`);
  await expect(page.getByTestId("outage-banner")).toBeVisible();

  await clearPowerMock(page);
  await mockPowerOk(page);
  await page.getByTestId("outage-retry").click();

  await expect(page.getByTestId("outage-banner")).toHaveCount(0);
  await expect(page.getByTestId("nowcast-source")).toContainText("Live");
});

test("?nowcast=offline simulates the outage without touching the network", async ({ page }) => {
  await mockPowerOk(page);
  await page.goto(`/field?farm=${FARM}&nowcast=offline`);

  await expect(page.getByTestId("outage-banner")).toBeVisible();
  await expect(page.getByTestId("outage-banner")).toContainText("offline (simulated)");
  await expect(page.getByTestId("nowcast-source")).toContainText("Saved");
  await expect(page.getByTestId("nowcast-card")).toContainText(/\d/);
});

test("/quick shows no ranking when the district pack cannot load, and Retry recovers", async ({ page }) => {
  await mockPowerOk(page);
  const DISTRICT_ROUTE = "**/data/packs/districts/satkhira.json";
  await page.route(DISTRICT_ROUTE, (route) => route.abort("failed"));
  await page.goto("/quick?district=satkhira");

  await expect(page.getByTestId("quick-pack-retry")).toBeVisible();
  await expect(page.getByText("no ranking is shown")).toBeVisible();
  await expect(page.getByTestId("quick-result")).toHaveCount(0);

  await page.unroute(DISTRICT_ROUTE);
  await page.getByTestId("quick-pack-retry").click();

  await expect(page.getByTestId("quick-pack-retry")).toHaveCount(0);
  await expect(page.getByTestId("quick-result").first()).toBeVisible();
});
