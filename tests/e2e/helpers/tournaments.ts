import { expect, type Page } from "@playwright/test";

const TOURNAMENT_CODE_URL = /\/matches\/tournament\/([A-Z0-9]+)$/;

/**
 * Creates a tournament through the organiser form and returns its join code.
 * The code only exists server-side until the redirect, so it is read back off
 * the URL the app lands on rather than being guessed up front.
 */
export const createTournament = async (
  page: Page,
  name: string,
): Promise<string> => {
  await page.goto("/tournaments#createTournament");

  await page.getByLabel("Tournament Name").fill(name);
  await page.getByRole("button", { name: "Create Tournament" }).click();

  await expect(page).toHaveURL(TOURNAMENT_CODE_URL);
  const code = TOURNAMENT_CODE_URL.exec(page.url())?.[1];
  expect(
    code,
    "tournament code should be present in the redirect URL",
  ).toBeTruthy();

  return code as string;
};

export const openByCodeFromHome = async (
  page: Page,
  code: string,
): Promise<void> => {
  await page.goto("/");
  await page.getByLabel("Tournament Code").fill(code);
  await page.getByRole("button", { name: "View Tournament" }).click();
};
