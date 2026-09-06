import type React from "react";
import {
  FiHome,
  FiAward,
  FiBarChart2,
  FiGithub,
  FiHelpCircle,
  FiLock,
  FiShield,
} from "react-icons/fi";
import { LuSword } from "react-icons/lu";
import { KEYBOARD_SHORTCUTS } from "../keyboardShortcuts";

export const GITHUB_REPO_URL =
  "https://github.com/karanshukla/totalwarhammer-tournament-app";

export interface PrimaryNavEntry {
  icon: React.ElementType;
  to: string;
  label: string;
  shortcut: string;
}

// Home / Tournaments / Matches / Statistics — the uniform primary tab-bar
// entries. Account is rendered separately by NavItems.tsx since it carries a
// conditional Guest badge that doesn't fit this shape.
export const PRIMARY_NAV_ENTRIES: PrimaryNavEntry[] = [
  { icon: FiHome, to: "/", label: "Home", shortcut: KEYBOARD_SHORTCUTS.home },
  {
    icon: FiAward,
    to: "/tournaments",
    label: "Tournaments",
    shortcut: KEYBOARD_SHORTCUTS.tournaments,
  },
  {
    icon: LuSword,
    to: "/matches",
    label: "Matches",
    shortcut: KEYBOARD_SHORTCUTS.matches,
  },
  {
    icon: FiBarChart2,
    to: "/statistics",
    label: "Statistics",
    shortcut: KEYBOARD_SHORTCUTS.statistics,
  },
];

export interface OverflowNavEntry {
  icon: React.ElementType;
  to?: string;
  toExternal?: string;
  label: string;
  shortcut: string;
}

// The links that don't fit in the mobile bottom tab bar — rendered in the
// desktop sidebar (OverflowNavItems) and inside the mobile burger drawer
// (MobileOverflowMenu), so both surfaces stay in sync.
export const OVERFLOW_NAV_ENTRIES: OverflowNavEntry[] = [
  {
    icon: FiHelpCircle,
    to: "/contact",
    label: "Get Help",
    shortcut: KEYBOARD_SHORTCUTS.help,
  },
  {
    icon: FiLock,
    to: "/terms",
    label: "Terms of Use",
    shortcut: KEYBOARD_SHORTCUTS.terms,
  },
  {
    icon: FiShield,
    to: "/privacy",
    label: "Privacy Policy",
    shortcut: KEYBOARD_SHORTCUTS.privacy,
  },
  {
    icon: FiGithub,
    toExternal: GITHUB_REPO_URL,
    label: "Source Code",
    shortcut: KEYBOARD_SHORTCUTS.source,
  },
];
