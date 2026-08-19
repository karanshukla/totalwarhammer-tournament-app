import { describe, it, expect } from "vitest";
import {
  KEYBOARD_SHORTCUTS,
  KEYBOARD_SHORTCUT_LABELS,
} from "@/shared/ui/keyboardShortcuts";

describe("keyboard shortcut registry", () => {
  it("labels every shortcut", () => {
    // The help page and the handler used to keep separate lists and had
    // drifted: the documented Alt+8 opened a different page than it named.
    expect(Object.keys(KEYBOARD_SHORTCUT_LABELS).sort()).toEqual(
      Object.keys(KEYBOARD_SHORTCUTS).sort(),
    );
  });

  it("assigns each Alt+N combination to exactly one destination", () => {
    const combos = Object.values(KEYBOARD_SHORTCUTS);
    expect(new Set(combos).size).toBe(combos.length);
  });
});
