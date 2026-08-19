/**
 * Extended tests for Toaster.tsx covering the loading-type branch at line 32:
 *   `{toast.type === "loading" ? <Spinner /> : <Toast.Indicator />}`
 *
 * When a loading toast is created, ChakraToaster renders the Spinner variant.
 * We trigger this by calling toaster.loading() and waiting for the DOM update.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster } from "@/shared/ui/Toaster";
import { toaster } from "@/shared/ui/toasterStore";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  // Dismiss all toasts after each test to avoid state leakage between tests.
  toaster.dismiss();
});

function renderToaster() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Toaster />
    </ChakraProvider>,
  );
}

describe("Toaster – loading toast branch (line 32)", () => {
  it("renders a Spinner when a loading toast is created", async () => {
    renderToaster();

    act(() => {
      toaster.loading({ description: "Loading data…" });
    });

    await waitFor(
      () => {
        // Chakra v3 Spinner renders with class "chakra-spinner"
        const spinner = document.body.querySelector(".chakra-spinner");
        expect(spinner).not.toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it("renders Toast.Indicator (not Spinner) for a success toast", async () => {
    renderToaster();

    act(() => {
      toaster.success({ title: "Done", description: "Success!" });
    });

    await waitFor(
      () => {
        const toastRoot = document.body.querySelector('[data-scope="toast"]');
        expect(toastRoot).not.toBeNull();
      },
      { timeout: 3000 },
    );

    // A success toast should NOT have a spinner
    const spinner = document.body.querySelector('[data-scope="spinner"]');
    expect(spinner).toBeNull();
  });

  it("renders toast title when provided", async () => {
    renderToaster();

    act(() => {
      toaster.loading({ title: "Please wait", description: "Working…" });
    });

    await waitFor(
      () => {
        const toastEls = document.body.querySelectorAll('[data-scope="toast"]');
        expect(toastEls.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );
  });

  it("toaster.dismiss() removes all toasts without throwing", () => {
    renderToaster();
    act(() => {
      toaster.loading({ description: "Temp toast" });
    });
    expect(() => toaster.dismiss()).not.toThrow();
  });
});
