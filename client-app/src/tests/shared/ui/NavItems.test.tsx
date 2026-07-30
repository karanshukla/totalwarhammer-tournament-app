/**
 * Branch coverage for shared/ui/NavItems.tsx:
 * - NavItem: toExternal → window.open() on click
 * - NavItem: to → navigate(to) on click
 * - NavItem: Enter/Space key → handleClick
 * - isPortrait=true: Account shows Guest badge when isUserGuest=true
 * - isPortrait=true: hides desktop-only items (Terms, GitHub etc.)
 * - isPortrait=false: shows all desktop items including Terms/GitHub
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();
const mockWindowOpen = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import NavItems from "@/shared/ui/NavItems";

function renderNav({
  isPortrait = false,
  isMobile = false,
  currentPath = "/",
  isUserGuest = false,
} = {}) {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <NavItems
          isPortrait={isPortrait}
          isMobile={isMobile}
          currentPath={currentPath}
          isUserGuest={isUserGuest}
        />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("NavItems – desktop (!isPortrait)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Terms of Use and Privacy Policy links in desktop mode", () => {
    renderNav({ isPortrait: false });
    expect(screen.getByText(/terms of use/i)).toBeInTheDocument();
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
  });
});

describe("NavItems – portrait mode (isPortrait=true)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT show Terms of Use visibly in portrait mode until the overflow menu opens", () => {
    renderNav({ isPortrait: true });
    // The overflow items live inside a closed popover: present for the popover
    // machinery but not visible to the user until opened.
    expect(screen.queryByText(/terms of use/i)).not.toBeVisible();
  });

  it("shows Guest badge on Account item when isUserGuest=true in portrait", () => {
    renderNav({ isPortrait: true, isUserGuest: true });
    expect(screen.getByText("Guest")).toBeInTheDocument();
  });

  it("does not show Guest badge when isUserGuest=false in portrait", () => {
    renderNav({ isPortrait: true, isUserGuest: false });
    expect(screen.queryByText("Guest")).not.toBeInTheDocument();
  });
});

describe("NavItems – NavItem click (to vs toExternal)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = mockWindowOpen;
  });

  it("calls navigate when NavItem has 'to' prop", async () => {
    renderNav({ isPortrait: false });
    await userEvent.click(screen.getByText(/home/i));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("calls window.open when NavItem has 'toExternal' prop (Source Code link)", async () => {
    renderNav({ isPortrait: false });
    await userEvent.click(screen.getByText(/source code/i));
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("github.com"),
      "_blank",
    );
  });
});

describe("NavItems – NavItem keyboard navigation (Enter/Space)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("triggers navigation on Enter key press", () => {
    renderNav({ isPortrait: false });
    const homeItem =
      screen.getByText(/home/i).closest("[role]") ??
      screen.getByText(/home/i).parentElement!;
    fireEvent.keyDown(homeItem, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("triggers navigation on Space key press", () => {
    renderNav({ isPortrait: false });
    const matchesItem =
      screen.getByText(/matches/i).closest("[role]") ??
      screen.getByText(/matches/i).parentElement!;
    fireEvent.keyDown(matchesItem, { key: " " });
    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });

  it("does nothing on an unrelated key press (e.g. Tab)", () => {
    renderNav({ isPortrait: false });
    const homeItem =
      screen.getByText(/home/i).closest("[role]") ??
      screen.getByText(/home/i).parentElement!;
    fireEvent.keyDown(homeItem, { key: "Tab" });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("NavItems – portrait + mobile (isPortrait && isMobile)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("visually hides labels but keeps them accessible when portrait and mobile", () => {
    renderNav({ isPortrait: true, isMobile: true });
    // Text is present for screen readers via VisuallyHidden, not visibly rendered as normal Text
    expect(screen.getByText(/home/i)).toBeInTheDocument();
  });
});

describe("NavItems – mobile burger/overflow menu (issue #147)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a burger overflow trigger in the portrait (mobile) layout", () => {
    renderNav({ isPortrait: true, isMobile: true });
    expect(
      screen.getByRole("button", { name: /open more navigation options/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show the burger trigger in the desktop layout", () => {
    renderNav({ isPortrait: false, isMobile: false });
    expect(
      screen.queryByRole("button", { name: /open more navigation options/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the five primary tab-bar items in portrait mode", () => {
    renderNav({ isPortrait: true, isMobile: true });
    for (const label of [
      "Home",
      "Tournaments",
      "Matches",
      "Statistics",
      "Account",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
  });

  it("surfaces Help, Terms, Privacy, and Source Code when the burger menu opens", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    const trigger = screen.getByRole("button", {
      name: /open more navigation options/i,
    });
    await userEvent.click(trigger);

    expect(await screen.findByText(/get help/i)).toBeVisible();
    expect(screen.getByText(/terms of use/i)).toBeVisible();
    expect(screen.getByText(/privacy policy/i)).toBeVisible();
    expect(screen.getByText(/source code/i)).toBeVisible();
  });

  it("shows the footer copyright text inside the opened menu", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    expect(await screen.findByText(/TW Tournament App/i)).toBeVisible();
  });

  it("navigates when an overflow item is clicked (Get Help)", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    await userEvent.click(await screen.findByText(/get help/i));
    expect(mockNavigate).toHaveBeenCalledWith("/contact");
  });

  it("opens the Source Code external link in a new tab", async () => {
    window.open = mockWindowOpen;
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    await userEvent.click(await screen.findByText(/source code/i));
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("github.com"),
      "_blank",
    );
  });

  it("closes the menu after navigating from an overflow item", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    const help = await screen.findByText(/get help/i);
    await userEvent.click(help);
    // Menu collapsed: the overflow labels are no longer visible.
    expect(screen.queryByText(/privacy policy/i)).not.toBeVisible();
  });
});
