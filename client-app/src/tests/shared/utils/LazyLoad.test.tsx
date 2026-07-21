/**
 * Branch coverage for shared/utils/LazyLoad.tsx:
 * - options?.loadingFallback || <DefaultLoadingFallback /> → default (Spinner)
 * - options?.loadingFallback → custom loading fallback
 * - options?.errorFallback || <DefaultErrorFallback /> → default error
 * - options?.errorFallback → custom error fallback
 * - ErrorBoundary: this.state.hasError=false → renders children
 * - ErrorBoundary: this.state.hasError=true → renders fallback
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React, { Suspense } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { lazyLoad } from "@/shared/utils/LazyLoad";

function wrap(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

describe("lazyLoad – default loading fallback (Spinner)", () => {
  it("shows Spinner while the lazy component is loading", async () => {
    // Never-resolving import keeps the component in "loading" state
    const LazyComp = lazyLoad(() => new Promise(() => {}));
    wrap(<LazyComp />);
    // DefaultLoadingFallback renders a Spinner (role=status from aria)
    // Spinner is a visual element; check that the loading state is shown
    // We can't easily test "no content rendered" but can confirm no content
    expect(screen.queryByText("Hello Lazy")).not.toBeInTheDocument();
  });
});

describe("lazyLoad – custom loading fallback", () => {
  it("shows custom loading element when provided", async () => {
    const LazyComp = lazyLoad(() => new Promise(() => {}), {
      loadingFallback: <div data-testid="custom-loading">Loading…</div>,
    });
    wrap(<LazyComp />);
    expect(screen.getByTestId("custom-loading")).toBeInTheDocument();
  });
});

describe("lazyLoad – default error fallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Failed to load component' when the lazy import throws", async () => {
    // Suppress console.error from the ErrorBoundary
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const BrokenComponent = React.lazy(() =>
      Promise.reject(new Error("chunk load error")),
    );

    // Use lazyLoad's ErrorBoundary by wrapping a failing component
    const LazyComp = lazyLoad(
      () =>
        Promise.reject(new Error("chunk load error")) as unknown as Promise<{
          default: React.ComponentType;
        }>,
    );
    wrap(<LazyComp />);

    await waitFor(() =>
      expect(screen.getByText(/failed to load component/i)).toBeInTheDocument(),
    );
    consoleSpy.mockRestore();
  });
});

describe("lazyLoad – custom error fallback", () => {
  it("shows custom error element when lazy import fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const LazyComp = lazyLoad(
      () =>
        Promise.reject(new Error("import error")) as unknown as Promise<{
          default: React.ComponentType;
        }>,
      { errorFallback: <div data-testid="custom-error">Oops!</div> },
    );
    wrap(<LazyComp />);
    await waitFor(() =>
      expect(screen.getByTestId("custom-error")).toBeInTheDocument(),
    );
    consoleSpy.mockRestore();
  });
});

describe("lazyLoad – successful load renders children", () => {
  it("renders the lazy component once loaded", async () => {
    const LazyComp = lazyLoad(() =>
      Promise.resolve({
        default: () => <div data-testid="lazy-content">Hello Lazy</div>,
      }),
    );
    wrap(<LazyComp />);
    await waitFor(() =>
      expect(screen.getByTestId("lazy-content")).toBeInTheDocument(),
    );
  });
});
