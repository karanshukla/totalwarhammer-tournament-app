import { useCallback, useEffect, useRef, useState } from "react";
import { httpClient } from "@/core/api/httpClient";
import type { Tournament } from "@/shared/tournament/types";
import type { GameFilter } from "../TournamentList";

export const PAGE_SIZE = 12;

export type StatusFilter = "all" | "pending" | "active" | "completed";

interface TournamentsListResponse {
  success: boolean;
  data: Tournament[];
  total: number;
  statusCounts: Record<StatusFilter, number>;
}

/**
 * Fetches the current user's tournaments for the list view, refetching
 * whenever the page number or a filter changes.
 */
export function useTournamentsList(isAuthenticated: () => boolean) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const hasEverLoaded = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<
    Record<StatusFilter, number>
  >({ all: 0, pending: 0, active: 0, completed: 0 });

  const fetchTournaments = useCallback(async () => {
    if (!isAuthenticated()) {
      setLoading(false);
      setTournaments([]);
      return;
    }
    if (hasEverLoaded.current) {
      setListLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (gameFilter !== "all") params.game = gameFilter;
      const res = (await httpClient.get("/tournament/mine", {
        params,
      })) as TournamentsListResponse;
      hasEverLoaded.current = true;
      setTournaments(res.data ?? []);
      setTotal(res.total ?? 0);
      setStatusCounts(
        res.statusCounts ?? { all: 0, pending: 0, active: 0, completed: 0 },
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tournaments",
      );
    } finally {
      setLoading(false);
      setListLoading(false);
    }
  }, [isAuthenticated, page, statusFilter, gameFilter]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const changeStatusFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const changeGameFilter = (next: GameFilter) => {
    setGameFilter(next);
    setPage(1);
  };

  return {
    tournaments,
    setTournaments,
    loading,
    listLoading,
    error,
    statusFilter,
    gameFilter,
    page,
    total,
    statusCounts,
    fetchTournaments,
    setPage,
    changeStatusFilter,
    changeGameFilter,
  };
}
