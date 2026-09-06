import type { User } from "@/shared/stores/userStore";
import type { BrowserTournament } from "./types";

/**
 * Whether the signed-in user is already a participant. Organiser-added
 * participants have no `userId`, so those are matched by name instead.
 */
export function isAlreadyJoined(
  tournament: BrowserTournament,
  user: User | null | undefined,
): boolean {
  if (!user) return false;
  const uid = user.id;
  const name = user.username || uid;
  return tournament.participants.some((p) => {
    if (p.userId) return p.userId === uid;
    return p.name === name;
  });
}
