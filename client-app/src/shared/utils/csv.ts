export type CsvRow = Record<string, unknown>;

const NEEDS_QUOTING = /[",\r\n]/;

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Serialise rows to RFC 4180 CSV. Columns are the union of every row's keys in
 * first-seen order, so a row that omits an optional field still lines up.
 */
export const toCsv = (rows: CsvRow[]): string => {
  if (rows.length === 0) return "";

  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }

  const lines = [
    columns.map(escapeCell).join(","),
    ...rows.map((row) => columns.map((c) => escapeCell(row[c])).join(",")),
  ];

  return lines.join("\r\n");
};

/**
 * `tw-<surface>-<section>-<game>-<range>-<yyyy-mm-dd>.csv`, e.g.
 * `tw-stats-topFactions-wh3-30d-2026-08-03.csv`.
 */
export const csvFilename = (parts: {
  surface: string;
  section: string;
  game: string;
  range: string;
  date?: Date;
}): string => {
  const date = parts.date ?? new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return `tw-${parts.surface}-${parts.section}-${parts.game}-${parts.range}-${stamp}.csv`;
};

/**
 * Hand the browser a CSV download. The BOM keeps Excel from mangling non-ASCII
 * faction names, which is the whole reason the payload isn't plain text.
 */
export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
