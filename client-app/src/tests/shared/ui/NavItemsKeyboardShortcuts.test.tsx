/**
 * Keyboard shortcut tests for shared/ui/NavItems.tsx
 * Covers the document-level Alt+key handlers in the NavItems useEffect.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
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

function renderNav(props: Partial<React.ComponentProps<typeof NavItems>> = {}) {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <NavItems
          isPortrait={false}
          isMobile={false}
          currentPath="/"
          isUserGuest={false}
          {...props}
        />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe("NavItems – Alt+key document keyboard shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = mockWindowOpen;
  });

  afterEach(() => {
    cleanup();
  });

  it("Alt+1 navigates to /", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit1", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("Alt+2 navigates to /tournaments", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit2", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/tournaments");
  });

  it("Alt+3 navigates to /matches", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit3", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/matches");
  });

  it("Alt+4 navigates to /statistics", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit4", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/statistics");
  });

  it("Alt+5 navigates to /account", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit5", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/account");
  });

  it("Alt+6 navigates to /contact", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit6", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/contact");
  });

  it("Alt+7 navigates to /terms", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit7", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/terms");
  });

  it("Alt+8 navigates to /privacy (matches KEYBOARD_SHORTCUTS.privacy label)", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit8", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/privacy");
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it("Alt+9 opens GitHub (Source Code) in a new tab via window.open", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit9", altKey: true });
    expect(mockWindowOpen).toHaveBeenCalledWith(
      expect.stringContaining("github.com"),
      "_blank",
    );
  });

  it("Alt+unknown key hits the default branch and does nothing", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit0", altKey: true });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });

  it("non-Alt key press is ignored", () => {
    renderNav();
    fireEvent.keyDown(document, { code: "Digit1", altKey: false });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("macOS Option+1 (key reported as '¡', code as Digit1) still navigates to /", () => {
    renderNav();
    fireEvent.keyDown(document, { key: "¡", code: "Digit1", altKey: true });
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("event listener is removed on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderNav();
    expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
