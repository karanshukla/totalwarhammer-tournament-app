/**
 * Branch coverage for bracket/SortableItem.tsx:
 * - isDragging=false (line 27-28, 40): zIndex=1, opacity=1, bg="transparent"
 * - isDragging=true (line 27-28, 40): zIndex=10, opacity=0.8, bg="info.subtle"
 * - participant name and faction are rendered
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const mockUseSortable = vi.fn();

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: (args: unknown) => mockUseSortable(args),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: (t: unknown) => (t ? String(t) : undefined) } },
}));

import { SortableItem } from "@/features/tournaments/components/bracket/SortableItem";

function makeSortableReturn(isDragging: boolean) {
  return {
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging,
  };
}

function renderItem(isDragging: boolean) {
  mockUseSortable.mockReturnValue(makeSortableReturn(isDragging));
  return render(
    <ChakraProvider value={defaultSystem}>
      <SortableItem
        id="p1"
        participant={{ id: "p1", name: "Grimgork", faction: "Orks" }}
      />
    </ChakraProvider>,
  );
}

describe("SortableItem – not dragging (isDragging=false)", () => {
  it("renders participant name and faction", () => {
    renderItem(false);
    expect(screen.getByText("Grimgork")).toBeInTheDocument();
    expect(screen.getByText("Orks")).toBeInTheDocument();
  });

  it("applies zIndex=1 and opacity=1 when not dragging", () => {
    const { container } = renderItem(false);
    const box = container.firstChild as HTMLElement;
    expect(box.style.zIndex).toBe("1");
    expect(box.style.opacity).toBe("1");
  });
});

describe("SortableItem – dragging (isDragging=true)", () => {
  it("applies zIndex=10 and opacity=0.8 when dragging", () => {
    const { container } = renderItem(true);
    const box = container.firstChild as HTMLElement;
    expect(box.style.zIndex).toBe("10");
    expect(box.style.opacity).toBe("0.8");
  });
});
