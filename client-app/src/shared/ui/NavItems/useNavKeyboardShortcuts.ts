import { useEffect } from "react";
import type { NavigateFunction } from "react-router";
import { GITHUB_REPO_URL } from "./navEntries";

/**
 * Alt+N global navigation shortcuts. Alt (Option on macOS) remaps `event.key`
 * to layout-specific glyphs — e.g. Alt/Option+1 reports key "¡" rather than
 * "1" on macOS keyboard layouts. `event.code` reports the physical key
 * ("Digit1") regardless of modifiers or OS, so shortcuts stay consistent
 * across macOS, Windows, and Linux (and any external keyboard on Android/iOS).
 */
export function useNavKeyboardShortcuts(navigate: NavigateFunction) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;

      switch (event.code) {
        case "Digit1":
          event.preventDefault();
          navigate("/");
          break;
        case "Digit2":
          event.preventDefault();
          navigate("/tournaments");
          break;
        case "Digit3":
          event.preventDefault();
          navigate("/matches");
          break;
        case "Digit4":
          event.preventDefault();
          navigate("/statistics");
          break;
        case "Digit5":
          event.preventDefault();
          navigate("/account");
          break;
        case "Digit6":
          event.preventDefault();
          navigate("/contact");
          break;
        case "Digit7":
          event.preventDefault();
          navigate("/terms");
          break;
        case "Digit8":
          event.preventDefault();
          navigate("/privacy");
          break;
        case "Digit9":
          event.preventDefault();
          window.open(GITHUB_REPO_URL, "_blank");
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);
}
