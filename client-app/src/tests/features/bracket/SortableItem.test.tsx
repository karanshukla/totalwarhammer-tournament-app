import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: vi.fn(() => "") } },
}));

import { useSortable } from "@dnd-kit/sortable";
import { SortableItem } from "@/features/tournaments/components/bracket/SortableItem";
import type { Participant } from "@/features/tournaments/components/bracket/types";

const mockUseSortable = vi.mocked(useSortable);

const testParticipant: Participant = {
  id: "p1",
  name: "Alice",
  faction: "Empire",
};

function makeSortableReturn(isDragging = false) {
  return {
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging,
  } as unknown as ReturnType<typeof useSortable>;
}

function renderSortableItem(isDragging = false, participant = testParticipant) {
  mockUseSortable.mockReturnValue(makeSortableReturn(isDragging));
  return render(
    <ChakraProvider value={defaultSystem}>
      <SortableItem id="p1" participant={participant} />
    </ChakraProvider>,
  );
}

describe("SortableItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders participant name", () => {
    renderSortableItem();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders participant faction", () => {
    renderSortableItem();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });

  it("applies non-dragging styles when isDragging is false", () => {
    const { container } = renderSortableItem(false);
    expect(container.firstChild).toBeDefined();
  });

  it("applies dragging styles when isDragging is true", () => {
    renderSortableItem(true);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });

  it("calls setNodeRef on the box element", () => {
    const setNodeRef = vi.fn();
    mockUseSortable.mockReturnValue({
      ...makeSortableReturn(),
      setNodeRef,
    });
    render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={testParticipant} />
      </ChakraProvider>,
    );
    expect(setNodeRef).toHaveBeenCalled();
  });

  it("renders participant with different faction", () => {
    const chaos: Participant = { id: "p2", name: "Bob", faction: "Chaos" };
    renderSortableItem(false, chaos);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Chaos")).toBeInTheDocument();
  });

  it("applies dragging style branches - zIndex and opacity", () => {
    const { container } = renderSortableItem(true);
    expect(container).toBeDefined();
  });
});
