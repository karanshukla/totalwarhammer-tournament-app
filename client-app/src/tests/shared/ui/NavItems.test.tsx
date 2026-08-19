/**
 * Branch coverage for shared/ui/NavItems.tsx:
 * - NavItem: toExternal → anchor with href/target/rel
 * - NavItem: to → router link with href
 * - NavItem: active item carries aria-current="page"
 * - NavItem: a nav entry stays active on the nested routes it owns
 * - isPortrait=true: Account shows Guest badge when isUserGuest=true
 * - isPortrait=true: hides desktop-only items (Terms, GitHub etc.)
 * - isPortrait=false: shows all desktop items including Terms/GitHub
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();

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

describe("NavItems – NavItem renders real links (to vs toExternal)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders an internal NavItem as a link pointing at its route", () => {
    renderNav({ isPortrait: false });
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders a toExternal NavItem as an anchor that opens safely in a new tab", () => {
    renderNav({ isPortrait: false });
    const source = screen.getByRole("link", { name: /source code/i });
    expect(source).toHaveAttribute(
      "href",
      expect.stringContaining("github.com"),
    );
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("marks only the active NavItem with aria-current=page", () => {
    renderNav({ isPortrait: false, currentPath: "/matches" });
    expect(screen.getByRole("link", { name: /matches/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /home/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it.each([
    ["/matches/tournament/R1MT3H", /matches/i],
    ["/matches/spectate/R1MT3H", /matches/i],
    ["/tournament/abc123", /tournaments/i],
  ])("keeps the owning nav entry active on %s", (currentPath, label) => {
    renderNav({ isPortrait: false, currentPath });
    expect(screen.getByRole("link", { name: label })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark Home active on a nested route", () => {
    renderNav({ isPortrait: false, currentPath: "/matches/tournament/ABC123" });
    expect(screen.getByRole("link", { name: /home/i })).not.toHaveAttribute(
      "aria-current",
    );
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
        screen.getByRole("link", { name: new RegExp(label, "i") }),
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

  it("exposes overflow items as links to their routes (Get Help)", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    expect(
      await screen.findByRole("link", { name: /get help/i }),
    ).toHaveAttribute("href", "/contact");
  });

  it("exposes the Source Code overflow item as an external link", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    const source = await screen.findByRole("link", { name: /source code/i });
    expect(source).toHaveAttribute(
      "href",
      expect.stringContaining("github.com"),
    );
    expect(source).toHaveAttribute("target", "_blank");
  });

  it("closes the menu after navigating from an overflow item", async () => {
    renderNav({ isPortrait: true, isMobile: true });
    await userEvent.click(
      screen.getByRole("button", { name: /open more navigation options/i }),
    );
    const help = await screen.findByText(/get help/i);
    await userEvent.click(help);
    // Menu collapsed: the overflow labels are no longer visible. The popover
    // tears down asynchronously, so poll rather than assert on the first tick.
    await waitFor(() => {
      const privacy = screen.queryByText(/privacy policy/i);
      if (privacy) expect(privacy).not.toBeVisible();
    });
  });
});
