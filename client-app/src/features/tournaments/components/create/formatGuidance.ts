export interface FormatGuidance {
  warnings: string[];
  infos: string[];
}

const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

const plural = (n: number, word: string, suffix = "s") =>
  `${n} ${word}${n === 1 ? "" : suffix}`;

export const swissRoundCount = (playerCount: number) =>
  Math.ceil(Math.log2(Math.max(playerCount, 2)));

const guidanceByFormat: Record<string, (n: number) => FormatGuidance> = {
  "Single Elimination": (n) => {
    const warnings: string[] = [];
    if (n < 2) warnings.push("Need at least 2 players.");
    if (!isPowerOfTwo(n)) {
      const byes = n - Math.pow(2, Math.floor(Math.log2(n)));
      warnings.push(
        `${n} players is not a power of 2 - ${byes} player(s) will receive a bye in round 1.`,
      );
    }
    return { warnings, infos: [] };
  },

  "Double Elimination": (n) => {
    const warnings: string[] = [];
    const infos: string[] = [];
    if (n < 4) warnings.push("Double Elimination requires at least 4 players.");
    if (!isPowerOfTwo(n)) {
      infos.push(
        `${n} players is not a power of 2 - some round 1 matches will have byes.`,
      );
    }
    return { warnings, infos };
  },

  "Swiss System": (n) => {
    const warnings: string[] = [];
    if (n % 2 !== 0) {
      warnings.push(
        `Odd number of players (${n}) - one player will receive a bye each round.`,
      );
    }
    const rounds = swissRoundCount(n);
    return {
      warnings,
      infos: [`Will run ${plural(rounds, "round")} (⌈log₂(${n})⌉).`],
    };
  },

  "Round Robin": (n) => {
    const warnings: string[] = [];
    if (n < 3) warnings.push("Round Robin works best with 3 or more players.");

    const rounds = n % 2 === 0 ? n - 1 : n;
    const matchesPerRound = Math.floor(n / 2);
    const infos = [
      `${plural(rounds, "round")}, ${plural(matchesPerRound, "match", "es")}/round - ${
        n % 2 !== 0 ? "1 bye per round" : "no byes"
      }.`,
    ];

    if (n > 16) {
      warnings.push(
        `${n} players means ${rounds * matchesPerRound} total matches - consider Swiss instead.`,
      );
    }
    return { warnings, infos };
  },
};

/** Format-specific bracket warnings shown live as the organiser fills the form. */
export function formatGuidance(
  tournamentType: string,
  playerCount: number,
): FormatGuidance {
  return (
    guidanceByFormat[tournamentType]?.(playerCount) ?? {
      warnings: [],
      infos: [],
    }
  );
}
