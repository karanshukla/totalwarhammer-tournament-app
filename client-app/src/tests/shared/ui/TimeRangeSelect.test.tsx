/**
 * Coverage for shared/ui/TimeRangeSelect.tsx:
 * - renders every window as a pressable option
 * - marks only the selected window with aria-pressed
 * - clicking another window calls onChange with that value
 * - clicking the already-selected window is a no-op, so a stats page does not
 *   refetch the data it is already showing
 * - disabled blocks interaction while a fetch is in flight
 * - default (md) size renders, which the two call sites never exercise
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

import TimeRangeSelect from "@/shared/ui/TimeRangeSelect";
import {
  RANGE_OPTIONS,
  RANGE_DESCRIPTIONS,
  type StatsRange,
} from "@/shared/ui/timeRange";

function renderSelect(
  props: Partial<React.ComponentProps<typeof TimeRangeSelect>> = {},
) {
  const onChange = vi.fn();
  render(
    <ChakraProvider value={defaultSystem}>
      <TimeRangeSelect value="all" onChange={onChange} {...props} />
    </ChakraProvider>,
  );
  return { onChange };
}

describe("TimeRangeSelect", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders one option per supported window", () => {
    renderSelect();
    for (const { label } of RANGE_OPTIONS) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("group", { name: "Time range" }),
    ).toBeInTheDocument();
  });

  it("marks only the selected window as pressed", () => {
    renderSelect({ value: "30d" });
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the newly chosen window", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: "all" });

    await user.click(screen.getByRole("button", { name: "90d" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("90d");
  });

  it("ignores a click on the window already selected", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: "7d" });

    await user.click(screen.getByRole("button", { name: "7d" }));

    // Re-selecting the current window would trigger a pointless refetch.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report a change while disabled", async () => {
    // A disabled control has pointer-events: none, which user-event treats as
    // a test bug unless the check is turned off for this interaction.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onChange } = renderSelect({ value: "all", disabled: true });

    const option = screen.getByRole("button", { name: "7d" });
    expect(option).toBeDisabled();
    await user.click(option);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders at the default size", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelect({ value: "all", size: "md" });

    await user.click(screen.getByRole("button", { name: "30d" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("30d");
  });
});

describe("RANGE_DESCRIPTIONS", () => {
  it("describes every option the selector can render", () => {
    // The stats views print this next to each list; a missing key would render
    // "undefined" as the window caption.
    for (const { range } of RANGE_OPTIONS) {
      expect(RANGE_DESCRIPTIONS[range as StatsRange]).toBeTruthy();
    }
  });
});
