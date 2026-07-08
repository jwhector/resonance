import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// jsdom ships no ResizeObserver, but some primitives (Radix form-bubble inputs used by
// the design-system composites) measure themselves via it. Stub it so components mount
// in the test DOM the same way they do in the browser.
if (!("ResizeObserver" in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserver as unknown as typeof globalThis.ResizeObserver;
}

// Vitest globals are off in this package, so RTL's auto-cleanup (which hooks a global
// `afterEach`) never registers — unmount rendered trees between tests explicitly.
afterEach(() => {
  cleanup();
});
