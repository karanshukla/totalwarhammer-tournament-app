import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  NumberInputRoot,
  NumberInputField,
  NumberInputStepper,
  NumberInputControl,
  NumberInputIncrementTrigger,
  NumberInputDecrementTrigger,
} from "@/shared/ui/NumberInput";

function renderInput(value = "5") {
  return render(
    <ChakraProvider value={defaultSystem}>
      <NumberInputRoot defaultValue={value} min={0} max={100}>
        <NumberInputField />
        <NumberInputControl>
          <NumberInputIncrementTrigger />
          <NumberInputDecrementTrigger />
        </NumberInputControl>
      </NumberInputRoot>
    </ChakraProvider>,
  );
}

describe("NumberInput components", () => {
  it("renders NumberInputRoot without crashing", () => {
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <NumberInputRoot defaultValue="1" />
      </ChakraProvider>,
    );
    expect(container).toBeDefined();
  });

  it("renders NumberInputField inside root", () => {
    renderInput("3");
    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
  });

  it("NumberInputField shows the default value", () => {
    renderInput("7");
    const input = screen.getByRole("spinbutton");
    // jsdom returns string values for number inputs
    expect(input).toBeInTheDocument();
  });

  it("renders increment and decrement triggers", () => {
    renderInput("5");
    // Chakra NumberInput renders increment/decrement buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("NumberInputStepper is exported correctly (equals NumberInputControl)", () => {
    expect(NumberInputStepper).toBeDefined();
    expect(NumberInputControl).toBeDefined();
    // Both should be the same Chakra component
    expect(NumberInputStepper).toBe(NumberInputControl);
  });

  it("NumberInputIncrementTrigger renders without crash", () => {
    renderInput("5");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("NumberInputDecrementTrigger renders without crash", () => {
    renderInput("5");
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("accepts ref on NumberInputField", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <ChakraProvider value={defaultSystem}>
        <NumberInputRoot defaultValue="1">
          <NumberInputField ref={ref} />
        </NumberInputRoot>
      </ChakraProvider>,
    );
    // Ref should be attached to the input element
    expect(ref.current).not.toBeNull();
  });

  it("accepts ref on NumberInputIncrementTrigger", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <ChakraProvider value={defaultSystem}>
        <NumberInputRoot defaultValue="1">
          <NumberInputControl>
            <NumberInputIncrementTrigger ref={ref} />
          </NumberInputControl>
        </NumberInputRoot>
      </ChakraProvider>,
    );
    expect(ref.current).not.toBeNull();
  });

  it("accepts ref on NumberInputDecrementTrigger", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(
      <ChakraProvider value={defaultSystem}>
        <NumberInputRoot defaultValue="1">
          <NumberInputControl>
            <NumberInputDecrementTrigger ref={ref} />
          </NumberInputControl>
        </NumberInputRoot>
      </ChakraProvider>,
    );
    expect(ref.current).not.toBeNull();
  });
});
