/**
 * Branch coverage for shared/ui/PasswordInput.tsx:
 * PasswordInput:
 *   - visible=false (default) → type="password", shows LuEye icon
 *   - after toggle → type="text", shows LuEyeOff icon
 *   - onPointerDown disabled guard: rest.disabled=true → no toggle
 *   - onPointerDown button guard: e.button !== 0 → no toggle
 * PasswordStrengthMeter (getColorPalette):
 *   - percent < 33 → "Low" label
 *   - percent < 66 → "Medium" label
 *   - default (percent >= 66) → "High" label
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  PasswordInput,
  PasswordStrengthMeter,
} from "@/shared/ui/PasswordInput";

function renderPasswordInput(
  props: React.ComponentProps<typeof PasswordInput> = {},
) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <PasswordInput
        placeholder="password"
        data-testid="pwd-input"
        {...props}
      />
    </ChakraProvider>,
  );
}

describe("PasswordInput – initial type", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders as type='password' by default", () => {
    const { container } = renderPasswordInput();
    const input = container.querySelector("input");
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("PasswordInput – toggle visibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("switches to type='text' after clicking the toggle button", () => {
    const { container } = renderPasswordInput();
    const toggleBtn = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });
    fireEvent.pointerDown(toggleBtn, { button: 0 });
    expect(container.querySelector("input")).toHaveAttribute("type", "text");
  });

  it("switches back to type='password' after clicking toggle twice", () => {
    const { container } = renderPasswordInput();
    const toggleBtn = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });
    fireEvent.pointerDown(toggleBtn, { button: 0 });
    fireEvent.pointerDown(toggleBtn, { button: 0 });
    expect(container.querySelector("input")).toHaveAttribute(
      "type",
      "password",
    );
  });
});

describe("PasswordInput – onPointerDown guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not toggle when disabled prop is true", () => {
    const { container } = renderPasswordInput({ disabled: true });
    const toggleBtn = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });
    fireEvent.pointerDown(toggleBtn, { button: 0 });
    expect(container.querySelector("input")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("does not toggle when pointer button is not 0 (non-left-click)", () => {
    const { container } = renderPasswordInput();
    const toggleBtn = screen.getByRole("button", {
      name: /toggle password visibility/i,
    });
    fireEvent.pointerDown(toggleBtn, { button: 1 });
    expect(container.querySelector("input")).toHaveAttribute(
      "type",
      "password",
    );
  });
});

describe("PasswordInput – defaultVisible prop", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders as type='text' when defaultVisible=true", () => {
    const { container } = renderPasswordInput({ defaultVisible: true });
    expect(container.querySelector("input")).toHaveAttribute("type", "text");
  });
});

function renderMeter(value: number, max = 4) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <PasswordStrengthMeter value={value} max={max} />
    </ChakraProvider>,
  );
}

describe("PasswordStrengthMeter – getColorPalette labels", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Low' label when percent < 33 (value=0)", () => {
    renderMeter(0);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("shows 'Medium' label when 33 ≤ percent < 66 (value=2, max=4 → 50%)", () => {
    renderMeter(2, 4);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("shows 'High' label when percent >= 66 (value=4, max=4 → 100%)", () => {
    renderMeter(4, 4);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("shows 'Low' for 1 out of 4 (25%)", () => {
    renderMeter(1, 4);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("shows 'High' for 3 out of 4 (75%)", () => {
    renderMeter(3, 4);
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
