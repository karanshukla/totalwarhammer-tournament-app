/**
 * Branch coverage for shared/ui/ColorMode.tsx:
 * - toggleColorMode: resolvedTheme === "dark" → setTheme("light")
 * - toggleColorMode: resolvedTheme !== "dark" → setTheme("dark")
 * - useColorModeValue: colorMode === "dark" → returns dark value
 * - useColorModeValue: colorMode !== "dark" → returns light value
 * - ColorModeIcon: colorMode === "dark" → renders LuMoon
 * - ColorModeIcon: colorMode !== "dark" → renders LuSun
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

const { mockUseTheme } = vi.hoisted(() => ({
  mockUseTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: mockUseTheme,
}));

vi.mock("react-icons/lu", () => ({
  LuMoon: () => <span data-testid="icon-moon" />,
  LuSun: () => <span data-testid="icon-sun" />,
  LuEye: () => null,
  LuEyeOff: () => null,
}));

import {
  useColorMode,
  useColorModeValue,
  ColorModeIcon,
  ColorModeButton,
} from "@/shared/ui/ColorMode";

describe("useColorMode – toggleColorMode branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls setTheme('light') when resolvedTheme is 'dark'", () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.toggleColorMode());
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when resolvedTheme is 'light'", () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: mockSetTheme,
    });
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.toggleColorMode());
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("exposes colorMode and setColorMode from useTheme", () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    const { result } = renderHook(() => useColorMode());
    expect(result.current.colorMode).toBe("dark");
    expect(result.current.setColorMode).toBe(mockSetTheme);
  });
});

describe("useColorModeValue – dark vs light branch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the light value when colorMode is 'light'", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme: vi.fn() });
    const { result } = renderHook(() =>
      useColorModeValue("light-value", "dark-value"),
    );
    expect(result.current).toBe("light-value");
  });

  it("returns the dark value when colorMode is 'dark'", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme: vi.fn() });
    const { result } = renderHook(() =>
      useColorModeValue("light-value", "dark-value"),
    );
    expect(result.current).toBe("dark-value");
  });
});

describe("ColorModeIcon – moon vs sun", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders LuMoon when colorMode is 'dark'", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark", setTheme: vi.fn() });
    render(<ColorModeIcon />);
    expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-sun")).not.toBeInTheDocument();
  });

  it("renders LuSun when colorMode is 'light'", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "light", setTheme: vi.fn() });
    render(<ColorModeIcon />);
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-moon")).not.toBeInTheDocument();
  });
});

describe("ColorModeButton – click triggers toggleColorMode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls setTheme('light') when clicked in dark mode", () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    render(
      <ChakraProvider value={defaultSystem}>
        <ColorModeButton />
      </ChakraProvider>,
    );
    const btn = screen.getByRole("button", { name: /toggle color mode/i });
    fireEvent.click(btn);
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("calls setTheme('dark') when clicked in light mode", () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      resolvedTheme: "light",
      setTheme: mockSetTheme,
    });
    render(
      <ChakraProvider value={defaultSystem}>
        <ColorModeButton />
      </ChakraProvider>,
    );
    const btn = screen.getByRole("button", { name: /toggle color mode/i });
    fireEvent.click(btn);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
