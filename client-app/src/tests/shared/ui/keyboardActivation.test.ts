import { describe, it, expect, vi } from "vitest";
import { activateOnEnterOrSpace } from "@/shared/ui/keyboardActivation";

function keyEvent(key: string, defaultPrevented = false) {
  return {
    key,
    defaultPrevented,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLElement>;
}

describe("activateOnEnterOrSpace", () => {
  it("activates on Enter and on Space", () => {
    const onClick = vi.fn();
    const handler = activateOnEnterOrSpace<HTMLElement>(onClick);

    handler(keyEvent("Enter"));
    handler(keyEvent(" "));

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys so typing still works", () => {
    const onClick = vi.fn();
    activateOnEnterOrSpace<HTMLElement>(onClick)(keyEvent("a"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects an already-handled event", () => {
    const onClick = vi.fn();
    activateOnEnterOrSpace<HTMLElement>(onClick)(keyEvent("Enter", true));
    expect(onClick).not.toHaveBeenCalled();
  });
});
