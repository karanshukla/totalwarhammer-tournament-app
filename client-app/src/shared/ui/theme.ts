import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Light: muted army-green tints for backgrounds; sage-green borders with crimson emphasis
// Dark: deep forest-green backgrounds; medium-green borders with crimson emphasis on active/highlighted elements
const config = defineConfig({
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: {
            value: { _light: "white", _dark: "#0c1a10" },
          },
          canvas: {
            value: { _light: "#f2f7f2", _dark: "#081209" },
          },
          subtle: {
            value: { _light: "#f2f7f2", _dark: "#102016" },
          },
          muted: {
            value: { _light: "#e5eee5", _dark: "#162c1e" },
          },
          emphasized: {
            value: { _light: "#cfdfcf", _dark: "#1e3a28" },
          },
          panel: {
            value: { _light: "white", _dark: "#0e1f13" },
          },
        },
        // top-level alias used by AppShell nav areas via bg="chakra-body-bg"
        "chakra-body-bg": {
          value: { _light: "white", _dark: "#0c1a10" },
        },
        border: {
          DEFAULT: {
            value: { _light: "#adc4ad", _dark: "#2a4030" },
          },
          muted: {
            value: { _light: "#c8dac8", _dark: "#1e3024" },
          },
          subtle: {
            value: { _light: "#ddeadd", _dark: "#162618" },
          },
          // crimson on emphasized borders adds Warhammer flair without overwhelming
          emphasized: {
            value: { _light: "#c07070", _dark: "#6a2424" },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
