import { expect, test } from "@playwright/test";
import { mockPowerOk } from "./helpers";

/**
 * The golden path, on the built app with NASA POWER mocked: language, farm analysis, and a what-if
 * that visibly re-ranks. Scenario/farm pair checked against the engine before writing: on
 * rajshahi-07, rainfall −20% moves the third card from Aman→Maize→Mungbean (66.4) to
 * Aman→Lentil→Mungbean (62.5) and lowers every score.
 */
test.beforeEach(async ({ page }) => {
  await mockPowerOk(page);
});

test("home opens in English, and the বাংলা toggle carries across a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The rains shifted.");

  await page.getByRole("button", { name: "বাং" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("বৃষ্টির সময় বদলেছে।");
  // the sidebar nav and the home entry card carry the same label, so scope the check to the nav
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "স্থান বেছে নিন" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "দ্রুত উত্তর" })).toBeVisible();
  await expect(page.getByTestId("home-entry-quick")).toBeVisible();
  await expect(page.getByTestId("home-entry-locate")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("বৃষ্টির সময় বদলেছে।");
  await expect(page.getByRole("button", { name: "EN" })).toBeVisible();
});

test("a farm card opens /field, and the nowcast card reads the live response", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/field?farm=farm-12"]').first().click();

  await expect(page).toHaveURL(/\/field\?farm=farm-12$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Farm-12");
  await expect(page.getByTestId("nowcast-card")).toBeVisible();
  await expect(page.getByTestId("nowcast-source")).toContainText("Live");
  await expect(page.getByTestId("nowcast-card")).not.toContainText("NaN");
  await expect(page.getByTestId("outage-banner")).toHaveCount(0);
  await expect(page.getByText("Machine-learning monsoon forecast", { exact: true })).toBeVisible();
  await expect(page.getByText(/Trained on satellite rainfall \(CHIRPS\) and NASA POWER/)).toBeVisible();
  await expect(page.getByText(/in training|experimental/i)).toHaveCount(0);
});

test("a what-if re-ranks the plan and labels itself a stress test", async ({ page }) => {
  await page.goto("/plan?farm=rajshahi-07");
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  const before = (await cards.allTextContents()).slice(0, 3).join("|");

  await page.getByRole("button", { name: "Rainfall −20%" }).click();

  await expect(page.getByText("Stress test — not a forecast")).toBeVisible();
  await expect.poll(async () => (await cards.allTextContents()).slice(0, 3).join("|")).not.toBe(before);

  const after = (await cards.allTextContents()).slice(0, 3);
  expect(after).toHaveLength(3);
  const score = (text: string) => Number(text.match(/(\d+(?:\.\d+)?)\/100/)?.[1] ?? Number.NaN);
  expect(score(after[0])).toBeLessThan(67.6);
});
