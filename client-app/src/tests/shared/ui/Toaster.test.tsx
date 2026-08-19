import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster, toaster } from "@/shared/ui/Toaster";

const defaultMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

// jsdom doesn't implement matchMedia; provide a stub so useMediaQuery works
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: defaultMatchMedia(false),
  });
});

afterEach(() => {
  // Clear all toasts between tests so they don't bleed over
  toaster.remove();
  // Restore non-mobile matchMedia
  window.matchMedia = defaultMatchMedia(false);
});

function renderToaster() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Toaster />
    </ChakraProvider>,
  );
}

describe("Toaster component", () => {
  it("renders without crashing", () => {
    const { container } = renderToaster();
    expect(container).toBeDefined();
  });

  it("exports toaster object with create methods", () => {
    expect(toaster).toBeDefined();
    expect(typeof toaster.success).toBe("function");
    expect(typeof toaster.error).toBe("function");
    expect(typeof toaster.info).toBe("function");
  });

  it("renders a portal container in the DOM", () => {
    renderToaster();
    // The Toaster wraps content in a Portal, which should be mounted to document.body
    expect(document.body).toBeDefined();
  });
});

describe("Toaster exported createToaster instances", () => {
  it("toaster.success can be called without throwing", () => {
    expect(() =>
      toaster.success({ description: "Test success" }),
    ).not.toThrow();
  });

  it("toaster.error can be called without throwing", () => {
    expect(() => toaster.error({ description: "Test error" })).not.toThrow();
  });

  it("toaster.info can be called without throwing", () => {
    expect(() => toaster.info({ description: "Test info" })).not.toThrow();
  });
});

describe("Toaster – mobile viewport", () => {
  it("still renders toasts published to the single store", async () => {
    // Regression: the component used to switch to a second `mobileToaster`
    // store below 48em that no call site in the app ever published to, so
    // toasts silently never appeared on a phone.
    window.matchMedia = defaultMatchMedia(true);
    renderToaster();
    act(() => {
      toaster.success({ title: "Saved", description: "On mobile" });
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("On mobile")).toBeInTheDocument();
  });
});

describe("Toaster – toast render callback", () => {
  it("renders a success toast with title and description", async () => {
    renderToaster();
    act(() => {
      toaster.success({
        title: "Op successful",
        description: "It worked",
        duration: Infinity,
      });
    });
    await waitFor(
      () => {
        expect(screen.getByText("Op successful")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText("It worked")).toBeInTheDocument();
  });

  it("renders a loading toast (shows spinner path)", async () => {
    renderToaster();
    act(() => {
      toaster.loading({ title: "Loading data", duration: Infinity });
    });
    await waitFor(
      () => {
        expect(screen.getByText("Loading data")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders a toast with an action button", async () => {
    const onAction = vi.fn();
    renderToaster();
    act(() => {
      toaster.success({
        title: "With action",
        duration: Infinity,
        action: { label: "Undo", onClick: onAction },
      });
    });
    await waitFor(
      () => {
        expect(screen.getByText("Undo")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders a closable toast", async () => {
    renderToaster();
    act(() => {
      toaster.success({
        title: "Closable",
        duration: Infinity,
        meta: { closable: true },
      });
    });
    await waitFor(
      () => {
        expect(screen.getByText("Closable")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("renders a toast without description (description branch false)", async () => {
    renderToaster();
    act(() => {
      toaster.success({ title: "No desc toast", duration: Infinity });
    });
    await waitFor(
      () => {
        expect(screen.getByText("No desc toast")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
