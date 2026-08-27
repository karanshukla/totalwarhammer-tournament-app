import { expect, type Locator, type Page } from "@playwright/test";

import type { TestUser } from "./identity";

/**
 * The auth drawer lives in a portal alongside the rest of the page, and the
 * home page has its own "Tournament Code" input, so every field lookup here is
 * scoped to the dialog rather than the page.
 */
export const openAuthDrawer = async (page: Page): Promise<Locator> => {
  await page.getByRole("button", { name: "Register/Login" }).click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByText("Register, login or reset your password"),
  ).toBeVisible();
  return drawer;
};

export const signedInIndicator = (page: Page): Locator =>
  page.getByRole("button", { name: "Logout" });

export const continueAsGuest = async (page: Page): Promise<void> => {
  const drawer = await openAuthDrawer(page);
  await drawer.getByRole("button", { name: "Continue as Guest" }).click();
  await expect(signedInIndicator(page)).toBeVisible();
};

/**
 * Walks the real two-step flow — the identifier check decides whether the
 * drawer shows the login or the registration form, so a spec that skipped it
 * would not exercise the branch the app actually takes.
 */
export const registerUser = async (
  page: Page,
  user: TestUser,
): Promise<void> => {
  const drawer = await openAuthDrawer(page);

  await drawer.getByLabel("Username or Email").fill(user.username);
  await drawer.getByRole("button", { name: "Submit" }).click();

  const emailField = drawer.getByLabel("Email Address");
  await expect(emailField).toBeVisible();
  await expect(drawer.getByLabel("Username", { exact: true })).toHaveValue(
    user.username,
  );

  await emailField.fill(user.email);
  await drawer.getByLabel("Password", { exact: true }).fill(user.password);
  await drawer.getByRole("button", { name: "Register" }).click();

  await expect(signedInIndicator(page)).toBeVisible();
};

export const logIn = async (page: Page, user: TestUser): Promise<void> => {
  const drawer = await openAuthDrawer(page);

  await drawer.getByLabel("Username or Email").fill(user.username);
  await drawer.getByRole("button", { name: "Submit" }).click();

  await drawer.getByLabel("Email or Username").fill(user.username);
  await drawer.getByLabel("Password", { exact: true }).fill(user.password);
  await drawer.getByRole("button", { name: "Login" }).click();
};

export const logOut = async (page: Page): Promise<void> => {
  await signedInIndicator(page).click();
  await expect(
    page.getByRole("button", { name: "Register/Login" }),
  ).toBeVisible();
};
