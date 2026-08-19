import type { Participant } from "@/shared/tournament/types";

export type ParticipantViewer = {
  id: string;
  username?: string;
  isGuest?: boolean;
} | null;

/**
 * Whether a roster entry is the viewer. Participants added by an organiser have
 * no `userId`, so those fall back to matching the name they were entered under.
 */
export const isSameUser = (
  participant: Participant,
  user: ParticipantViewer,
): boolean => {
  if (!user) return false;
  if (participant.userId) return participant.userId === user.id;
  const lowerName = user.username?.trim().toLowerCase();
  return (
    participant.name === user.id ||
    (!!lowerName && participant.name.trim().toLowerCase() === lowerName)
  );
};
