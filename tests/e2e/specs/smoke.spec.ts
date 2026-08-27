import { expect, test } from "../fixtures";

test.describe("app shell", () => {
  test("home page renders the hero and the tournament lookup", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "TW Tournament App", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Tournament Code")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Register/Login" }),
    ).toBeVisible();
  });

  test("sidebar navigates between the main sections", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Main" });

    await nav.getByRole("link", { name: /^Tournaments/ }).click();
    await expect(page).toHaveURL(/\/tournaments/);
    await expect(
      page.getByRole("heading", { name: "Tournaments", level: 1 }),
    ).toBeVisible();

    await nav.getByRole("link", { name: /^Statistics/ }).click();
    await expect(page).toHaveURL(/\/statistics/);

    await nav.getByRole("link", { name: /^Home/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("an unknown route renders the 404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(
      page.getByRole("heading", { name: "404 - Invalid URL" }),
    ).toBeVisible();
  });

  test("an unknown tournament code surfaces an inline error", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByLabel("Tournament Code").fill("ZZZZZZ");
    await page.getByRole("button", { name: "View Tournament" }).click();

    await expect(
      page.getByText("No tournament found with that code."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
