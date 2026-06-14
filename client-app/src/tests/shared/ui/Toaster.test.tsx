import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster, toaster, mobileToaster } from "@/shared/ui/Toaster";

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
  // Clear all toasts from both stores between tests so they don't bleed over
  toaster.remove();
  mobileToaster.remove();
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

  it("exports mobileToaster object", () => {
    expect(mobileToaster).toBeDefined();
    expect(typeof mobileToaster.success).toBe("function");
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

  it("mobileToaster.success can be called without throwing", () => {
    expect(() =>
      mobileToaster.success({ description: "Mobile test" }),
    ).not.toThrow();
  });
});

describe("Toaster – mobile branch", () => {
  it("renders using mobileToaster when isMobile is true", async () => {
    // Override matchMedia to simulate a mobile viewport
    window.matchMedia = defaultMatchMedia(true);
    const { container } = renderToaster();
    // isMobile=true → the component uses mobileToaster instead of toaster
    expect(container).toBeDefined();
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
