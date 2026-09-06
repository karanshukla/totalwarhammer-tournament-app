import { useState } from "react";

/**
 * Tracks which match (if any) has its inline result-override panel open, and
 * drives the confirm/cancel flow for it. Only one match's panel can be open
 * at a time across the whole section.
 */
export function useMatchOverridePanel(
  onOverrideResult: (
    matchId: string,
    winnerId: string,
    reason: string,
  ) => Promise<void>,
) {
  const [overrideMatchId, setOverrideMatchId] = useState<string | null>(null);
  const [overrideWinnerId, setOverrideWinnerId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const startOverride = (matchId: string) => {
    setOverrideMatchId(matchId);
    setOverrideWinnerId("");
    setOverrideReason("");
  };

  const cancelOverride = () => setOverrideMatchId(null);

  const confirmOverride = async () => {
    if (!overrideMatchId || !overrideWinnerId) return;
    setOverrideLoading(true);
    try {
      await onOverrideResult(overrideMatchId, overrideWinnerId, overrideReason);
      setOverrideMatchId(null);
      setOverrideWinnerId("");
      setOverrideReason("");
    } catch {
      // The parent handler already surfaced this via a toast; swallowing here
      // keeps it off window.onunhandledrejection.
    } finally {
      setOverrideLoading(false);
    }
  };

  return {
    overrideMatchId,
    overrideWinnerId,
    overrideReason,
    overrideLoading,
    startOverride,
    cancelOverride,
    confirmOverride,
    setOverrideWinnerId,
    setOverrideReason,
  };
}
