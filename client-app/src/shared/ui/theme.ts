import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Light: green body/nav bg + white panels (contrast), crimson borders throughout
// Dark: deep forest-green bg + white/pale panels, dark crimson borders
const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
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
          // All borders are crimson — gives the red presence on every card/input
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
