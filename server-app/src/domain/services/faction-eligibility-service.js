/**
 * Which factions a tournament will accept.
 *
 * A tournament is played under exactly one game system, and the roster a
 * player may pick from is that system's factions minus the ones the organiser
 * banned. Both constraints are enforced here so every write path — join, add
 * participant, edit participant — applies the same rule.
 */

import {
  factionNamesForGame,
  isFactionInGame,
} from "../../constants/factions.js";

export const WH3 = "wh3";
export const WARHAMMER_40K = "40k";

/** @param {{ enable40kFactions?: boolean }} tournament */
export const gameSystemOf = (tournament) =>
  tournament?.enable40kFactions ? WARHAMMER_40K : WH3;

export const gameSystemLabel = (game) =>
  game === WARHAMMER_40K ? "Warhammer 40,000" : "Warhammer III";

/** @param {{ enable40kFactions?: boolean, bannedFactions?: string[] }} tournament */
export function selectableFactions(tournament) {
  const banned = new Set(tournament?.bannedFactions ?? []);
  return factionNamesForGame(gameSystemOf(tournament)).filter(
    (name) => !banned.has(name),
  );
}

/**
 * Why `faction` cannot be used in `tournament`, or null when it is allowed.
 * An empty faction means "undeclared" and is always allowed.
 *
 * @param {{ enable40kFactions?: boolean, bannedFactions?: string[] }} tournament
 * @param {string | null | undefined} faction
 * @returns {string | null}
 */
export function factionRejectionReason(tournament, faction) {
  if (!faction) return null;

  const game = gameSystemOf(tournament);
  if (!isFactionInGame(faction, game)) {
    return `"${faction}" is not a ${gameSystemLabel(game)} faction`;
  }
  if (tournament?.bannedFactions?.includes(faction)) {
    return `"${faction}" is banned in this tournament`;
  }
  return null;
}
