import type React from "react";

/**
 * Enter/Space activation for a click-to-activate surface that isn't a real
 * button. Shared so every such call site behaves identically instead of
 * reimplementing — or, as happened on the tournament list, forgetting — it.
 */
export function activateOnEnterOrSpace<T extends HTMLElement>(
  onClick: (event: React.KeyboardEvent<T>) => void,
) {
  return (event: React.KeyboardEvent<T>) => {
    if (event.defaultPrevented) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick(event);
    }
  };
}
