import { blockThirdPartyFonts, expect, test } from "../fixtures";
import { continueAsGuest, registerUser } from "../helpers/auth";
import { buildTestUser, buildTournamentName } from "../helpers/identity";
import { createTournament, openByCodeFromHome } from "../helpers/tournaments";

test.describe("tournaments", () => {
  test("a registered user can create a tournament and lands on its page", async ({
    page,
  }) => {
    await page.goto("/");
    await registerUser(page, buildTestUser("org"));

    const name = buildTournamentName();
    const code = await createTournament(page, name);

    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Spectator View" }),
    ).toBeVisible();
    // The join code renders twice by design — the page header chip and the
    // Tournament Info row — so this asserts it is shown, not where.
    await expect(page.getByText(code, { exact: true }).first()).toBeVisible();
  });

  test("a guest cannot create a tournament", async ({ page }) => {
    await page.goto("/");
    await continueAsGuest(page);

    await page.goto("/tournaments#createTournament");

    await expect(page.getByText("Registration Required")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Tournament" }),
    ).toBeDisabled();
  });

  test("a new tournament shows up in the ongoing list", async ({ page }) => {
    await page.goto("/");
    await registerUser(page, buildTestUser("list"));

    const name = buildTournamentName();
    await createTournament(page, name);

    await page.goto("/tournaments#currentTournaments");

    await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  });

  // A second browser context, so the spectator carries none of the organiser's
  // cookies — this is the path a player following a shared code actually takes.
  test("a signed-out visitor can spectate a tournament by code", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await registerUser(page, buildTestUser("share"));
    const name = buildTournamentName();
    const code = await createTournament(page, name);

    const spectatorContext = await browser.newContext();
    await blockThirdPartyFonts(spectatorContext);
    const spectatorPage = await spectatorContext.newPage();

    try {
      await openByCodeFromHome(spectatorPage, code);

      await expect(spectatorPage).toHaveURL(
        new RegExp(`/matches/spectate/${code}$`),
      );
      await expect(
        spectatorPage.getByRole("heading", { name, level: 1 }),
      ).toBeVisible();
      await expect(spectatorPage.getByText("Spectating")).toBeVisible();
    } finally {
      await spectatorContext.close();
    }
  });

  test("an unknown code renders the not-found page", async ({ page }) => {
    await page.goto("/matches/spectate/NOPE99");

    await expect(page.getByText("Tournament Not Found")).toBeVisible();
  });
});
