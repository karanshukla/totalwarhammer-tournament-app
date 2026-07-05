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
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
const mockWindowOpen = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
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

  it("does NOT show Terms of Use in portrait mode", () => {
    renderNav({ isPortrait: true });
    expect(screen.queryByText(/terms of use/i)).not.toBeInTheDocument();
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
