import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Remap the `blue` palette to antique gold — every colorPalette="blue" component
// (buttons, badges, active nav, info text) automatically becomes gold-themed with
// zero component-file changes. Accessibility note: blue.contrast overridden to dark
// text since gold (#c9a227) is too light for white text (3.2:1 vs required 4.5:1).
const GOLD = {
  50: "#fefce8",
  100: "#fef9c3",
  200: "#fef08a",
  300: "#fde047",
  400: "#facc15",
  500: "#c9a227", // antique gold — solid button bg
  600: "#a37d1a", // brass
  700: "#7d5c10", // dark gold (light-mode fg, readable on green bg)
  800: "#5a4008",
  900: "#3d2b04",
  950: "#231802", // used as contrast text on solid gold buttons
};

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Override blue → antique gold. All colorPalette="blue" elements become gold.
        blue: Object.fromEntries(
          Object.entries(GOLD).map(([k, v]) => [k, { value: v }]),
        ),
      },
    },
    semanticTokens: {
      colors: {
        // Dark text on solid gold buttons for AA contrast (gold is too light for white)
        blue: {
          contrast: { value: "{colors.blue.950}" },
        },
        bg: {
          // Body background is clearly green — panels (white) float above it
          DEFAULT: {
            value: { _light: "#d8e8d8", _dark: "#0c1a10" },
          },
          canvas: {
            value: { _light: "#cfe0cf", _dark: "#081209" },
          },
          subtle: {
            value: { _light: "#d8e8d8", _dark: "#102016" },
          },
          muted: {
            value: { _light: "#c8dcc8", _dark: "#162c1e" },
          },
          emphasized: {
            value: { _light: "#b8ccb8", _dark: "#1e3a28" },
          },
          // Panels (cards, modals, forms) stay white in light / dark-green in dark
          panel: {
            value: { _light: "#ffffff", _dark: "#0e1f13" },
          },
        },
        // top-level alias used by AppShell nav/header via bg="chakra-body-bg"
        "chakra-body-bg": {
          value: { _light: "#d8e8d8", _dark: "#0c1a10" },
        },
        border: {
          // All borders are crimson — gives red presence on every card/input
          DEFAULT: {
            value: { _light: "#a85050", _dark: "#6e2c2c" },
          },
          muted: {
            value: { _light: "#c87878", _dark: "#4e2020" },
          },
          subtle: {
            value: { _light: "#e4b0b0", _dark: "#3a1818" },
          },
          emphasized: {
            value: { _light: "#7a1818", _dark: "#9a3c3c" },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
