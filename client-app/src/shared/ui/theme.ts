import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Crimson — Khorne / Imperial blood: primary brand, active states, focus rings
const CRIMSON = {
  50: { value: "#FCF1F1" },
  100: { value: "#F8D9D9" },
  200: { value: "#EFADAE" },
  300: { value: "#E27D7F" },
  400: { value: "#D24F52" },
  500: { value: "#C1272D" },
  600: { value: "#A11D22" },
  700: { value: "#7C181C" },
  800: { value: "#591316" },
  900: { value: "#380E10" },
};

// Brass — Imperial gold: ceremonial accents, champion highlights, secondary badges
const BRASS = {
  50: { value: "#FBF5E6" },
  100: { value: "#F4E6BE" },
  200: { value: "#E9CF86" },
  300: { value: "#DCB54E" },
  400: { value: "#CC9E27" },
  500: { value: "#B8860B" },
  600: { value: "#946B0C" },
  700: { value: "#6F510C" },
  800: { value: "#4B370A" },
  900: { value: "#2C2106" },
  950: { value: "#1A1206" },
};

// Verdigris — Realm of Chaos / Necron: info accent, teal highlights
const VERDIGRIS = {
  50: { value: "#EAF8F6" },
  100: { value: "#C6EEE8" },
  200: { value: "#92DDD3" },
  300: { value: "#54C4B8" },
  400: { value: "#29A597" },
  500: { value: "#14887D" },
  600: { value: "#106D65" },
  700: { value: "#0D524C" },
  800: { value: "#093A36" },
  900: { value: "#062421" },
};

// Ink — warm grimdark neutrals: backgrounds, borders, muted text
const INK = {
  50: { value: "#F6F4EF" },
  100: { value: "#E9E5DC" },
  200: { value: "#D6CFC1" },
  300: { value: "#B7AD9B" },
  400: { value: "#918778" },
  500: { value: "#6B6354" },
  600: { value: "#4F4940" },
  700: { value: "#38332C" },
  800: { value: "#25211B" },
  900: { value: "#16130F" },
  950: { value: "#0D0B08" },
};

const config = defineConfig({
  theme: {
    recipes: {
      button: {
        variants: {
          variant: {
            outline: {
              bg: "bg.emphasized",
            },
          },
        },
      },
      badge: {
        variants: {
          variant: {
            outline: {
              bg: "bg.emphasized",
            },
          },
        },
      },
    },
    tokens: {
      colors: {
        crimson: CRIMSON,
        brass: BRASS,
        verdigris: VERDIGRIS,
        ink: INK,
      },
      fonts: {
        heading: { value: "'Cinzel', serif" },
        body: { value: "'Barlow', system-ui, sans-serif" },
        mono: { value: "'JetBrains Mono', monospace" },
        cond: { value: "'Oswald', sans-serif" },
      },
    },
    semanticTokens: {
      colors: {
        // Chakra v3 auto-generates dark-mode solid from the 200 step (too light).
        // Explicit overrides ensure correct hue at all palette steps in both modes.
        crimson: {
          contrast: { value: "#FFFFFF" },
          solid: {
            value: {
              _light: "{colors.crimson.600}",
              _dark: "{colors.crimson.500}",
            },
          },
          fg: {
            value: {
              _light: "{colors.crimson.700}",
              _dark: "{colors.crimson.200}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.crimson.100}",
              _dark: "{colors.crimson.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.crimson.200}",
              _dark: "{colors.crimson.800}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.crimson.300}",
              _dark: "{colors.crimson.700}",
            },
          },
        },

        brass: {
          contrast: { value: "{colors.ink.950}" },
          solid: {
            value: {
              _light: "{colors.brass.400}",
              _dark: "{colors.brass.300}",
            },
          },
          fg: {
            value: {
              _light: "{colors.brass.700}",
              _dark: "{colors.brass.200}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.brass.100}",
              _dark: "{colors.brass.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.brass.200}",
              _dark: "{colors.brass.800}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.brass.300}",
              _dark: "{colors.brass.700}",
            },
          },
        },

        verdigris: {
          contrast: { value: "#FFFFFF" },
          solid: {
            value: {
              _light: "{colors.verdigris.600}",
              _dark: "{colors.verdigris.400}",
            },
          },
          fg: {
            value: {
              _light: "{colors.verdigris.700}",
              _dark: "{colors.verdigris.200}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.verdigris.100}",
              _dark: "{colors.verdigris.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.verdigris.200}",
              _dark: "{colors.verdigris.800}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.verdigris.300}",
              _dark: "{colors.verdigris.700}",
            },
          },
        },

        // ── Foreground / Text ────────────────────────────────────────────────
        "fg.primary": { value: { _light: "#1C1812", _dark: "#F3EFE6" } },
        "fg.secondary": { value: { _light: "#564E40", _dark: "#C2B9A7" } },
        "fg.muted": { value: { _light: "#857C6C", _dark: "#94896F" } },

        // ── Brand — Crimson (primary actions, active states, focus rings) ────
        "brand.solid": {
          value: {
            _light: "{colors.crimson.600}",
            _dark: "{colors.crimson.500}",
          },
        },
        "brand.hover": {
          value: {
            _light: "{colors.crimson.700}",
            _dark: "{colors.crimson.400}",
          },
        },
        "brand.active": {
          value: {
            _light: "{colors.crimson.800}",
            _dark: "{colors.crimson.600}",
          },
        },
        "brand.text": {
          value: { _light: "{colors.crimson.700}", _dark: "#E98A8C" },
        },
        "brand.subtle": { value: { _light: "#F7E2E0", _dark: "#33161A" } },
        "brand.border": { value: { _light: "#E9BDBC", _dark: "#5A2024" } },
        "brand.fg": { value: { _light: "#FFFFFF", _dark: "#FFFFFF" } },

        // ── Gold — Brass (heraldic, champion, ceremonial) ────────────────────
        "gold.solid": {
          value: { _light: "{colors.brass.600}", _dark: "{colors.brass.400}" },
        },
        "gold.hover": {
          value: { _light: "{colors.brass.700}", _dark: "{colors.brass.300}" },
        },
        "gold.text": {
          value: { _light: "{colors.brass.700}", _dark: "#E3C264" },
        },
        "gold.subtle": { value: { _light: "#F5E7C4", _dark: "#33280E" } },
        "gold.border": { value: { _light: "#E3CB87", _dark: "#5A4715" } },
        "gold.fg": {
          value: { _light: "{colors.ink.900}", _dark: "{colors.ink.800}" },
        },

        // ── Info — Verdigris (Realm of Chaos / Necron, informational UI) ─────
        "info.solid": {
          value: {
            _light: "{colors.verdigris.600}",
            _dark: "{colors.verdigris.400}",
          },
        },
        "info.hover": {
          value: {
            _light: "{colors.verdigris.700}",
            _dark: "{colors.verdigris.300}",
          },
        },
        "info.text": {
          value: { _light: "{colors.verdigris.700}", _dark: "#46C2B4" },
        },
        "info.subtle": { value: { _light: "#D4EEE9", _dark: "#0C2C29" } },
        "info.border": { value: { _light: "#A8DCD4", _dark: "#16504A" } },
        "info.fg": {
          value: { _light: "#FFFFFF", _dark: "{colors.verdigris.900}" },
        },

        // ── Match Status ─────────────────────────────────────────────────────
        "status.win": { value: { _light: "#1B7F45", _dark: "#34B86A" } },
        "status.win.subtle": { value: { _light: "#D7EDDF", _dark: "#0E2C1A" } },
        "status.win.border": { value: { _light: "#A7D6BA", _dark: "#1C5733" } },

        "status.loss": {
          value: { _light: "{colors.crimson.600}", _dark: "#E15A5D" },
        },
        "status.loss.subtle": {
          value: { _light: "#F6DDDB", _dark: "#33161A" },
        },
        "status.loss.border": {
          value: { _light: "#E9BDBC", _dark: "#5A2024" },
        },

        "status.draw": {
          value: { _light: "{colors.brass.600}", _dark: "#D7B254" },
        },
        "status.draw.subtle": {
          value: { _light: "#F4E6C2", _dark: "#33280E" },
        },
        "status.draw.border": {
          value: { _light: "#E3CB87", _dark: "#5A4715" },
        },

        "status.live": {
          value: { _light: "{colors.crimson.500}", _dark: "#FF4D52" },
        },
        "status.live.subtle": {
          value: { _light: "#F6DDDB", _dark: "#3A1618" },
        },

        "status.pending": {
          value: { _light: "{colors.ink.500}", _dark: "#9C927F" },
        },
        "status.pending.subtle": {
          value: { _light: "#E7E1D3", _dark: "#221D17" },
        },
        "status.pending.border": {
          value: { _light: "#CFC6B4", _dark: "#3A3328" },
        },

        // ── Backgrounds ──────────────────────────────────────────────────────
        bg: {
          DEFAULT: {
            value: { _light: "#F1ECE1", _dark: "#100D0A" },
          },
          canvas: {
            value: { _light: "#F1ECE1", _dark: "#100D0A" },
          },
          surface: {
            value: { _light: "#FBF8F1", _dark: "#1A1611" },
          },
          subtle: {
            value: { _light: "#E7E1D3", _dark: "#16130F" },
          },
          muted: {
            value: { _light: "#D6CFC1", _dark: "#221D17" },
          },
          emphasized: {
            value: { _light: "#B7AD9B", _dark: "#332D24" },
          },
          elevated: {
            value: { _light: "#FFFFFF", _dark: "#2A241C" },
          },
          panel: {
            value: { _light: "#FFFFFF", _dark: "#221D17" },
          },
        },
        // Used by AppShell nav/header via bg="chakra-body-bg"
        "chakra-body-bg": {
          value: { _light: "#F1ECE1", _dark: "#100D0A" },
        },

        // ── Borders ──────────────────────────────────────────────────────────
        border: {
          DEFAULT: {
            value: { _light: "#D5CCBA", _dark: "#332D24" },
          },
          muted: {
            value: { _light: "#E4DDCD", _dark: "#262019" },
          },
          subtle: {
            value: { _light: "#BEB39B", _dark: "#473F32" },
          },
          emphasized: {
            value: { _light: "#918778", _dark: "#4F4940" },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
