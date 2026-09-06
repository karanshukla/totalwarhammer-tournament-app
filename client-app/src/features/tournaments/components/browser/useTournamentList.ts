import { useCallback, useEffect, useState } from "react";
import { httpClient } from "@/core/api/httpClient";
import type { BrowserTournament } from "./types";

export type TournamentStatusFilter =
  "pending" | "active" | "completed" | ("pending" | "active" | "completed")[];

/** Fetches the tournaments matching a status filter, refetching whenever it changes. */
export function useTournamentList(statusFilter: TournamentStatusFilter) {
  const [tournaments, setTournaments] = useState<BrowserTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = Array.isArray(statusFilter)
        ? statusFilter.join(",")
        : statusFilter;
      const res = (await httpClient.get(
        `/tournament?status=${statusParam}`,
      )) as { success: boolean; data: BrowserTournament[] };
      setTournaments(res.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return { tournaments, loading, error };
}
