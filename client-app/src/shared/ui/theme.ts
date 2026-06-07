import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Light: blue-tinted subtle/muted backgrounds for warmth and character
// Dark: deep navy instead of neutral gray for depth matching the app's blue primary
const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: {
            value: { _light: "white", _dark: "#0f1624" },
          },
          canvas: {
            value: { _light: "{colors.blue.50}", _dark: "#0a1018" },
          },
          subtle: {
            value: { _light: "{colors.blue.50}", _dark: "#141e2e" },
          },
          muted: {
            value: { _light: "{colors.blue.100}", _dark: "#1a2640" },
          },
          emphasized: {
            value: { _light: "{colors.blue.200}", _dark: "#223150" },
          },
          panel: {
            value: { _light: "white", _dark: "#131c2b" },
          },
        },
        // top-level alias used by AppShell nav areas via bg="chakra-body-bg"
        "chakra-body-bg": {
          value: { _light: "white", _dark: "#0f1624" },
        },
        border: {
          DEFAULT: {
            value: { _light: "#c8d8ec", _dark: "#2a3a52" },
          },
          muted: {
            value: { _light: "#d8e6f4", _dark: "#1e2d44" },
          },
          subtle: {
            value: { _light: "#e5eff9", _dark: "#192540" },
          },
          emphasized: {
            value: { _light: "#b0c8e4", _dark: "#364e6e" },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
