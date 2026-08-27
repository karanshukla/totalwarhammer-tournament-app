/**
 * Specs run in parallel against one shared stack whose users and tournament
 * codes are globally unique, so every account a spec creates has to be unique
 * too — including across reruns, since the compose volumes outlive a single
 * `npm run test:e2e`.
 */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const randomSuffix = (length: number): string =>
  Array.from(
    { length },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

/**
 * @param prefix Short label that identifies the spec in the seeded data, so a
 *   surviving row in the test DB points back at what created it. Kept within
 *   the server's 30-character username limit.
 */
export const buildTestUser = (prefix = "e2e"): TestUser => {
  const username = `${prefix}_${randomSuffix(10)}`.slice(0, 30);
  return {
    username,
    email: `${username}@example.test`,
    password: "E2ePassw0rd!",
  };
};

export const buildTournamentName = (prefix = "E2E Tournament"): string =>
  `${prefix} ${randomSuffix(6)}`;
