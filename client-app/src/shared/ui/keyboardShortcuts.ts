/**
 * The single source of truth for the Alt+N navigation shortcuts. Both the
 * handler in NavItems and the help table on the Get Help page read from here —
 * they previously carried independent lists and had already drifted, so the
 * documented Alt+8 opened a different page than the one it named.
 */
export const KEYBOARD_SHORTCUTS = {
  home: "Alt+1",
  tournaments: "Alt+2",
  matches: "Alt+3",
  statistics: "Alt+4",
  account: "Alt+5",
  help: "Alt+6",
  terms: "Alt+7",
  privacy: "Alt+8",
  source: "Alt+9",
} as const;

export const KEYBOARD_SHORTCUT_LABELS: Record<
  keyof typeof KEYBOARD_SHORTCUTS,
  string
> = {
  home: "Home",
  tournaments: "Tournaments",
  matches: "Matches",
  statistics: "Statistics",
  account: "Account",
  help: "Get Help",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  source: "Source Code",
};
