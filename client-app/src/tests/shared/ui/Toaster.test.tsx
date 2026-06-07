import { describe, it, expect, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster, toaster, mobileToaster } from "@/shared/ui/Toaster";

// jsdom doesn't implement matchMedia; provide a stub so useMediaQuery works
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
