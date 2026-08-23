/**
 * Coverage for shared/utils/csv.ts:
 * toCsv:
 *   - empty input → empty string
 *   - header row from the union of every row's keys, in first-seen order
 *   - missing / null / undefined cells → empty
 *   - commas, quotes, newlines → quoted and doubled per RFC 4180
 * toSectionedCsv:
 *   - one titled block per section, blank line between
 *   - empty section keeps its title and says so
 * csvFilename:
 *   - tw-<surface>-<section>-<game>-<range>-<yyyy-mm-dd>.csv, zero-padded
 * downloadCsv:
 *   - Blob + object URL + anchor click, and the URL is revoked afterwards
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toCsv,
  toSectionedCsv,
  csvFilename,
  downloadCsv,
} from "@/shared/utils/csv";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("writes a header row followed by one line per row", () => {
    expect(toCsv([{ faction: "Empire", wins: 3 }])).toBe(
      "faction,wins\r\nEmpire,3",
    );
  });

  it("unions the columns of every row, keeping first-seen order", () => {
    const csv = toCsv([
      { faction: "Empire", wins: 3 },
      { faction: "Skaven", wins: 1, winRate: 50 },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "faction,wins,winRate",
      "Empire,3,",
      "Skaven,1,50",
    ]);
  });

  it("renders null and undefined cells as empty", () => {
    expect(toCsv([{ a: null, b: undefined, c: 0 }])).toBe("a,b,c\r\n,,0");
  });

  it("quotes fields containing a comma", () => {
    expect(toCsv([{ name: "Karl, the Emperor" }])).toBe(
      'name\r\n"Karl, the Emperor"',
    );
  });

  it("doubles embedded quotes", () => {
    expect(toCsv([{ name: 'Grimgork "da Boss"' }])).toBe(
      'name\r\n"Grimgork ""da Boss"""',
    );
  });

  it("quotes fields containing a newline", () => {
    expect(toCsv([{ notes: "line one\nline two" }])).toBe(
      'notes\r\n"line one\nline two"',
    );
  });
});

describe("csvFilename", () => {
  it("builds the tw-surface-section-game-range-date convention", () => {
    expect(
      csvFilename({
        surface: "stats",
        section: "topFactions",
        game: "wh3",
        range: "30d",
        date: new Date(2026, 7, 3),
      }),
    ).toBe("tw-stats-topFactions-wh3-30d-2026-08-03.csv");
  });

  it("falls back to today when no date is supplied", () => {
    expect(
      csvFilename({
        surface: "account",
        section: "activity",
        game: "40k",
        range: "all",
      }),
    ).toMatch(/^tw-account-activity-40k-all-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe("downloadCsv", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("clicks a temporary anchor and releases the object URL", async () => {
    const createObjectURL = vi.fn((blob: Blob) => `blob:${blob.size}`);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const downloadNames: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadNames.push(this.download);
    });

    downloadCsv("tw-test.csv", "a,b\r\n1,2");

    expect(downloadNames).toEqual(["tw-test.csv"]);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeObjectURL).toHaveBeenCalledWith(
      createObjectURL.mock.results[0].value,
    );
    expect(document.querySelector("a")).toBeNull();

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    // Blob.text() decodes away a leading BOM, so assert on the raw bytes: the
    // BOM is what keeps Excel from mangling non-ASCII faction names.
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe("a,b\r\n1,2");
  });
});

describe("toSectionedCsv", () => {
  it("writes one titled block per section, separated by a blank line", () => {
    const csv = toSectionedCsv([
      { title: "Summary", rows: [{ metric: "Total Tournaments", value: 42 }] },
      {
        title: "Top Winning Factions",
        rows: [
          { rank: 1, faction: "Kislev", wins: 7 },
          { rank: 2, faction: "Skaven", wins: 5 },
        ],
      },
    ]);

    expect(csv).toBe(
      [
        "Summary",
        "metric,value",
        "Total Tournaments,42",
        "",
        "Top Winning Factions",
        "rank,faction,wins",
        "1,Kislev,7",
        "2,Skaven,5",
      ].join("\r\n"),
    );
  });

  it("keeps each block on its own header, so unrelated shapes do not merge", () => {
    const csv = toSectionedCsv([
      { title: "A", rows: [{ onlyInA: 1 }] },
      { title: "B", rows: [{ onlyInB: 2 }] },
    ]);

    expect(csv).toContain("onlyInA\r\n1");
    expect(csv).toContain("onlyInB\r\n2");
    // A union header would have produced this; blocks must not.
    expect(csv).not.toContain("onlyInA,onlyInB");
  });

  it("keeps an empty section visible rather than dropping it", () => {
    const csv = toSectionedCsv([
      { title: "Recent Tournament Winners", rows: [] },
      { title: "Top Players", rows: [{ rank: 1, player: "Karz" }] },
    ]);

    expect(csv).toBe(
      [
        "Recent Tournament Winners",
        "(no data for this selection)",
        "",
        "Top Players",
        "rank,player",
        "1,Karz",
      ].join("\r\n"),
    );
  });

  it("escapes a title that contains a comma or quote", () => {
    const csv = toSectionedCsv([
      { title: 'Top "Winning" Factions, ranked', rows: [{ a: 1 }] },
    ]);

    expect(csv.split("\r\n")[0]).toBe('"Top ""Winning"" Factions, ranked"');
  });

  it("returns an empty string when there are no sections", () => {
    expect(toSectionedCsv([])).toBe("");
  });
});
