import type { Match, ReportedResult } from "@/shared/tournament/types";

export interface MatchViewer {
  id: string;
  username?: string;
  isGuest?: boolean;
}

export interface MatchViewerRole {
  isP1: boolean;
  isP2: boolean;
  myReport: ReportedResult | undefined;
  canParticipantReport: boolean;
}

/**
 * Determines the viewer's relationship to a match: which side (if either)
 * they're playing, their currently reported pick, and whether they're still
 * allowed to report a result.
 *
 * Guest identities aren't stored as a participantId, so a synthetic
 * `guest_<id6>` name is checked alongside the participant name match.
 */
export function resolveMatchViewerRole(
  match: Match,
  viewer: MatchViewer | null,
  isActive: boolean,
): MatchViewerRole {
  const viewerName = viewer?.username?.trim().toLowerCase();
  const viewerId = viewer?.id;
  const guestFallbackName =
    viewer?.isGuest && viewerId ? `guest_${viewerId.substring(0, 6)}` : null;
  const matchesViewerName = (name: string) => {
    const lowerName = name.trim().toLowerCase();
    return (
      (viewerName && lowerName === viewerName) ||
      (guestFallbackName && lowerName === guestFallbackName)
    );
  };
  const isP1 =
    match.player1.participantId === viewerId ||
    !!matchesViewerName(match.player1.name) ||
    match.player1.name === viewerId;
  const isP2 =
    match.player2.participantId === viewerId ||
    !!matchesViewerName(match.player2.name) ||
    match.player2.name === viewerId;
  const myReport = match.reportedResults?.find(
    (report) =>
      report.reportedBy ===
        (isP1 ? match.player1.participantId : match.player2.participantId) ||
      report.reportedByName === viewerName,
  );
  const canParticipantReport =
    (isP1 || isP2) &&
    isActive &&
    match.status !== "completed" &&
    match.status !== "disputed";

  return { isP1, isP2, myReport, canParticipantReport };
}
