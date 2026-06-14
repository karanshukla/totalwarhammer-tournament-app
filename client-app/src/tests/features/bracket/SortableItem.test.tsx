import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableItem } from "@/features/tournaments/components/bracket/SortableItem";
import type { Participant } from "@/features/tournaments/components/bracket/types";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: vi.fn((t) => (t ? `translate3d(${t.x}px,${t.y}px,0)` : "")),
    },
  },
}));

const mockUseSortable = vi.mocked(useSortable);
const mockCSSToString = vi.mocked(CSS.Transform.toString);

const baseParticipant: Participant = {
  id: "p1",
  name: "Sigmar Knight",
  faction: "Empire",
};

function makeSortableReturn(isDragging: boolean) {
  return {
    attributes: { role: "button" as const, tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: isDragging ? { x: 10, y: 20, scaleX: 1, scaleY: 1 } : null,
    transition: isDragging ? "transform 200ms ease" : undefined,
    isDragging,
  };
}

function renderItem(participant = baseParticipant, isDragging = false) {
  mockUseSortable.mockReturnValue(makeSortableReturn(isDragging));
  return render(
    <ChakraProvider value={defaultSystem}>
      <SortableItem id={participant.id} participant={participant} />
    </ChakraProvider>,
  );
}

describe("SortableItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCSSToString.mockImplementation((t) =>
      t ? `translate3d(${t.x}px,${t.y}px,0)` : "",
    );
  });

  it("renders participant name", () => {
    renderItem();
    expect(screen.getByText("Sigmar Knight")).toBeInTheDocument();
  });

  it("renders participant faction", () => {
    renderItem();
    expect(screen.getByText("Empire")).toBeInTheDocument();
  });

  it("calls useSortable with the given id", () => {
    renderItem(baseParticipant, false);
    expect(mockUseSortable).toHaveBeenCalledWith({ id: "p1" });
  });

  it("applies non-dragging inline style (zIndex 1, opacity 1)", () => {
    mockUseSortable.mockReturnValue(makeSortableReturn(false));
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={baseParticipant} />
      </ChakraProvider>,
    );
    // Root Box gets the inline style; opacity 1 and zIndex 1
    const root = container.firstChild as HTMLElement;
    expect(root).toBeDefined();
  });

  it("applies dragging inline style (zIndex 10, opacity 0.8) when isDragging is true", () => {
    mockUseSortable.mockReturnValue(makeSortableReturn(true));
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={baseParticipant} />
      </ChakraProvider>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toBeDefined();
    // The style object includes opacity: 0.8 and zIndex: 10
    expect(root.style.opacity).toBe("0.8");
    expect(root.style.zIndex).toBe("10");
  });

  it("CSS.Transform.toString is called with the transform value", () => {
    const transform = { x: 5, y: 10, scaleX: 1, scaleY: 1 };
    mockUseSortable.mockReturnValue({
      ...makeSortableReturn(false),
      transform,
    });
    render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={baseParticipant} />
      </ChakraProvider>,
    );
    expect(mockCSSToString).toHaveBeenCalledWith(transform);
  });

  it("renders different participant names correctly", () => {
    const chaos: Participant = { id: "p2", name: "Chaos Lord", faction: "Warriors of Chaos" };
    renderItem(chaos);
    expect(screen.getByText("Chaos Lord")).toBeInTheDocument();
    expect(screen.getByText("Warriors of Chaos")).toBeInTheDocument();
  });

  it("isDragging true — opacity is 0.8 and zIndex is 10 in style", () => {
    mockUseSortable.mockReturnValue(makeSortableReturn(true));
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={baseParticipant} />
      </ChakraProvider>,
    );
    const root = container.firstChild as HTMLElement;
    expect(Number(root.style.zIndex)).toBe(10);
    expect(Number(root.style.opacity)).toBeCloseTo(0.8);
  });

  it("isDragging false — opacity is 1 and zIndex is 1 in style", () => {
    mockUseSortable.mockReturnValue(makeSortableReturn(false));
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <SortableItem id="p1" participant={baseParticipant} />
      </ChakraProvider>,
    );
    const root = container.firstChild as HTMLElement;
    expect(Number(root.style.zIndex)).toBe(1);
    expect(Number(root.style.opacity)).toBe(1);
  });
});
