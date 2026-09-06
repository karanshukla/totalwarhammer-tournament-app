import { useCallback, useEffect, useState } from "react";
import {
  toCsv,
  toSectionedCsv,
  csvFilename,
  downloadCsv,
} from "@/shared/utils/csv";
import { toaster } from "@/shared/ui/toasterStore";
import { RANGE_DESCRIPTIONS, type StatsRange } from "@/shared/ui/timeRange";
import {
  fetchStats,
  MAX_LIST_LIMIT,
  type Game,
  type Stats,
} from "../api/statisticsApi";
import {
  CSV_ROWS,
  LIST_SECTIONS,
  PAGE_STEP,
  SECTION_DEFAULTS,
  SECTION_TITLES,
  SUMMARY_ROWS,
  TOTAL_KEYS,
  type ListSection,
} from "../utils/statsSections";

/** Props every `StatsSection` card needs, independent of what it renders. */
export interface SectionRenderProps {
  title: string;
  shown: number;
  available: number;
  total?: number;
  loadingMore: boolean;
  onShowMore: () => void;
  onExport: () => void;
  exporting: boolean;
}

/**
 * Owns statistics data fetching, the per-section "show more" paging, and CSV
 * export, so `StatisticsPage` can stay a plain composition of section
 * components.
 */
export function useStatisticsData() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game>("wh3");
  const [range, setRange] = useState<StatsRange>("all");
  const [visibleCounts, setVisibleCounts] = useState(SECTION_DEFAULTS);
  const [fetchLimit, setFetchLimit] = useState<number | undefined>(undefined);
  const [pendingSection, setPendingSection] = useState<ListSection | null>(
    null,
  );
  const [exportingSection, setExportingSection] = useState<ListSection | null>(
    null,
  );
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchStats({ range, limit: fetchLimit });
        if (cancelled) return;
        setStats(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load statistics",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPendingSection(null);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range, fetchLimit]);

  const activeGameStats = stats?.[game];

  const showMore = useCallback(
    (section: ListSection) => {
      const next = Math.min(visibleCounts[section] + PAGE_STEP, MAX_LIST_LIMIT);
      setVisibleCounts((current) => ({ ...current, [section]: next }));
      if (activeGameStats && next > activeGameStats[section].length) {
        setPendingSection(section);
        setFetchLimit(next);
      }
    },
    [activeGameStats, visibleCounts],
  );

  const changeRange = useCallback((next: StatsRange) => {
    setRange(next);
    setVisibleCounts(SECTION_DEFAULTS);
    setFetchLimit(undefined);
  }, []);

  // Export always reflects the full list for the current game and range, not
  // the page on screen, so it needs its own unpaginated fetch.
  const exportSection = useCallback(
    async (section: ListSection, title: string) => {
      setExportingSection(section);
      try {
        const full = await fetchStats({ range, limit: MAX_LIST_LIMIT });
        downloadCsv(
          csvFilename({ surface: "stats", section, game, range }),
          toCsv(CSV_ROWS[section](full[game])),
        );
      } catch {
        toaster.create({
          title: "Export failed",
          description: `Could not build the ${title} CSV. Please try again.`,
          type: "error",
        });
      } finally {
        setExportingSection(null);
      }
    },
    [game, range],
  );

  // One fetch feeds every block, so exporting the whole page costs the same
  // request as exporting a single section.
  const exportEverything = useCallback(async () => {
    setExportingAll(true);
    try {
      const full = await fetchStats({ range, limit: MAX_LIST_LIMIT });
      const gameStats = full[game];
      downloadCsv(
        csvFilename({ surface: "stats", section: "all", game, range }),
        toSectionedCsv([
          { title: "Summary", rows: SUMMARY_ROWS(gameStats) },
          ...LIST_SECTIONS.map((section) => ({
            title: SECTION_TITLES[section],
            rows: CSV_ROWS[section](gameStats),
          })),
        ]),
      );
    } catch {
      toaster.create({
        title: "Export failed",
        description: "Could not build the statistics CSV. Please try again.",
        type: "error",
      });
    } finally {
      setExportingAll(false);
    }
  }, [game, range]);

  const sectionProps = (section: ListSection): SectionRenderProps => ({
    title: SECTION_TITLES[section],
    shown: visibleCounts[section],
    available: activeGameStats
      ? (activeGameStats[section] as unknown[]).length
      : 0,
    total: activeGameStats?.[TOTAL_KEYS[section]] as number | undefined,
    loadingMore: pendingSection === section,
    onShowMore: () => showMore(section),
    onExport: () => exportSection(section, SECTION_TITLES[section]),
    exporting: exportingSection === section,
  });

  const page = <T>(section: ListSection, rows: T[]): T[] =>
    rows.slice(0, visibleCounts[section]);

  return {
    stats,
    loading,
    error,
    game,
    setGame,
    range,
    changeRange,
    rangeLabel: RANGE_DESCRIPTIONS[range],
    activeGameStats,
    exportingAll,
    exportEverything,
    sectionProps,
    page,
  };
}
