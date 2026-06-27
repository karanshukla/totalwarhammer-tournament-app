import "@testing-library/jest-dom";

// Stub browser APIs missing from happy-dom that Ark UI / floating-ui require
// when opening a Select dropdown in tests.
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
