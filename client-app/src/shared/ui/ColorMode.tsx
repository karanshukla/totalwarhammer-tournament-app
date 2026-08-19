"use client";

import { ClientOnly, IconButton, Skeleton, Span } from "@chakra-ui/react";
import { ThemeProvider, ThemeProviderProps } from "next-themes";

import * as React from "react";
import { LuMoon, LuSun } from "react-icons/lu";
import { JSX } from "react/jsx-runtime";
import { useColorMode } from "./useColorMode";

export function ColorModeProvider(
  props: JSX.IntrinsicAttributes & ThemeProviderProps,
) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  );
}

export function ColorModeIcon() {
  const { colorMode } = useColorMode();
  return colorMode === "dark" ? <LuMoon /> : <LuSun />;
}

export const ColorModeButton = React.forwardRef(function ColorModeButton(
  props: React.ComponentPropsWithoutRef<typeof IconButton>,
  ref: React.Ref<HTMLButtonElement>,
) {
  const { toggleColorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  );
});

export const LightMode = React.forwardRef(function LightMode(
  props: React.ComponentPropsWithoutRef<typeof Span>,
  ref: React.Ref<HTMLSpanElement>,
) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme light"
      colorPalette="ink"
      colorScheme="light"
      ref={ref}
      {...props}
    />
  );
});

export const DarkMode = React.forwardRef(function DarkMode(
  props: React.ComponentPropsWithoutRef<typeof Span>,
  ref: React.Ref<HTMLSpanElement>,
) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme dark"
      colorPalette="ink"
      colorScheme="dark"
      ref={ref}
      {...props}
    />
  );
});
