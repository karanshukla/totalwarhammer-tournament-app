import { expect, test } from "../fixtures";

import {
  continueAsGuest,
  logIn,
  logOut,
  openAuthDrawer,
  registerUser,
  signedInIndicator,
} from "../helpers/auth";
import { buildTestUser } from "../helpers/identity";

test.describe("authentication", () => {
  test("a visitor can continue as a guest", async ({ page }) => {
    await page.goto("/");

    await continueAsGuest(page);

    await expect(page.getByText("Guest Mode")).toBeVisible();
  });

  test("a visitor can register, and the session survives a reload", async ({
    page,
  }) => {
    const user = buildTestUser("reg");
    await page.goto("/");

    await registerUser(page, user);

    // The store is persisted to localStorage but revalidated against the
    // server on boot, so a reload is what proves the session cookie stuck.
    await page.reload();
    await expect(signedInIndicator(page)).toBeVisible();
    await expect(page.getByText("Guest Mode")).toBeHidden();
  });

  test("a registered user can log out and log back in", async ({ page }) => {
    const user = buildTestUser("cycle");
    await page.goto("/");
    await registerUser(page, user);

    await logOut(page);

    await logIn(page, user);
    await expect(signedInIndicator(page)).toBeVisible();
  });

  test("a wrong password is rejected and leaves the visitor signed out", async ({
    page,
  }) => {
    const user = buildTestUser("badpw");
    await page.goto("/");
    await registerUser(page, user);
    await logOut(page);

    await logIn(page, { ...user, password: "NotTheRightPassw0rd!" });

    await expect(page.getByText("Login Failed")).toBeVisible();
    // The drawer marks the rest of the page aria-hidden while it is open, so
    // the signed-out check happens after a reload rather than behind it.
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Register/Login" }),
    ).toBeVisible();
  });

  test("the identifier check routes a known user to the login form", async ({
    page,
  }) => {
    const user = buildTestUser("known");
    await page.goto("/");
    await registerUser(page, user);
    await logOut(page);

    const drawer = await openAuthDrawer(page);
    await drawer.getByLabel("Username or Email").fill(user.username);
    await drawer.getByRole("button", { name: "Submit" }).click();

    await expect(drawer.getByLabel("Email or Username")).toHaveValue(
      user.username,
    );
    await expect(drawer.getByRole("button", { name: "Login" })).toBeVisible();
  });
});
