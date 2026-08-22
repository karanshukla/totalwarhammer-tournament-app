#!/usr/bin/env node
// Drives many tournaments through their full lifecycle concurrently against a
// running instance of the app (default: the Docker stack behind Caddy on
// :8080), to see how one Mongo + one Redis + one server instance behave under
// concurrent write load. See tests/stress/README.md for usage.
//
// Every request goes through the real HTTP API (guest/session auth, CSRF,
// tournament create/join/start/advance, match reporting) — nothing writes to
// Mongo directly.

const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:8080";
const TOURNAMENT_COUNT = Number(process.env.STRESS_TOURNAMENTS) || 20;
const PARTICIPANTS_PER_TOURNAMENT = Number(process.env.STRESS_PARTICIPANTS) || 8;
const RUN_TAG = process.env.STRESS_RUN_TAG || Date.now().toString(36);
const MAX_ROUNDS = 20;

const TOURNAMENT_TYPES = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss System",
];

const metrics = [];
function record(action, status, ms) {
  metrics.push({ action, status, ms });
}

class Session {
  constructor(label) {
    this.label = label;
    this.cookies = new Map();
    this.csrfToken = null;
    this.username = null;
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  absorbCookies(res) {
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const pair = raw.split(";", 1)[0];
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }

  async raw(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const cookieHeader = this.cookieHeader();
    if (cookieHeader) headers.Cookie = cookieHeader;
    if (this.csrfToken && method !== "GET") headers["X-CSRF-Token"] = this.csrfToken;

    const start = performance.now();
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const ms = performance.now() - start;
    this.absorbCookies(res);
    let json = null;
    try {
      json = await res.json();
    } catch {
      // non-JSON response body; leave json null
    }
    return { res, json, ms };
  }

  async ensureCsrf() {
    if (this.csrfToken) return;
    const { json } = await this.raw("GET", "/auth/csrf-token");
    this.csrfToken = json?.csrfToken ?? null;
  }

  async request(action, method, path, body, _retried = false) {
    if (method !== "GET") await this.ensureCsrf();
    const { res, json, ms } = await this.raw(method, path, body);
    record(action, res.status, ms);
    if (res.status === 403 && !_retried) {
      this.csrfToken = null;
      return this.request(action, method, path, body, true);
    }
    return { status: res.status, json };
  }
}

async function timedGet(action, path) {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`);
  const ms = performance.now() - start;
  record(action, res.status, ms);
  const json = await res.json().catch(() => null);
  return json;
}

async function createGuest() {
  const s = new Session("guest");
  const { json } = await s.request("guest.create", "POST", "/guest");
  s.username = json?.data?.username ?? null;
  return s;
}

async function registerAndLogin(username, email, password) {
  const s = new Session("creator");
  await s.request("user.register", "POST", "/user/register", {
    username,
    email,
    password,
  });
  await s.request("auth.login", "POST", "/auth/login", {
    identifier: username,
    password,
  });
  s.username = username;
  return s;
}

async function createTournament(creator, name, type) {
  const { json } = await creator.request("tournament.create", "POST", "/tournament", {
    name,
    description: "Stress test fixture",
    playerCount: PARTICIPANTS_PER_TOURNAMENT,
    tournamentType: type,
  });
  return json?.data ?? null;
}

async function joinTournament(session, tournamentId) {
  return session.request("tournament.join", "POST", `/tournament/${tournamentId}/join`, {
    faction: "",
  });
}

async function startTournament(creator, tournamentId) {
  return creator.request("tournament.start", "POST", `/tournament/${tournamentId}/start`);
}

async function advanceTournament(creator, tournamentId) {
  return creator.request("tournament.advance", "POST", `/tournament/${tournamentId}/advance`);
}

async function getTournament(tournamentId) {
  return timedGet("tournament.get", `/tournament/${tournamentId}`);
}

async function getMatches(tournamentId) {
  const json = await timedGet("match.list", `/match/tournament/${tournamentId}`);
  return json?.data ?? [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Two participants' reports race on the same match document (optimistic
// concurrency): the loser of that race gets a transient 500, same as a real
// client whose submit lost the race. Retry rather than treat it as fatal.
async function reportMatch(session, matchId, winnerId) {
  let result;
  for (let attempt = 0; attempt < 4; attempt++) {
    result = await session.request(
      "match.report",
      "PATCH",
      `/match/${matchId}/report`,
      { winnerId },
    );
    if (result.status !== 500) return result;
    await sleep(25 * (attempt + 1));
  }
  return result;
}

async function runTournamentFixture(index) {
  const type = TOURNAMENT_TYPES[index % TOURNAMENT_TYPES.length];
  const tag = `${RUN_TAG}_${index}`;

  const creator = await registerAndLogin(
    `stress_${tag}`,
    `stress_${tag}@stress.invalid`,
    "StressTest123!",
  );

  const created = await createTournament(creator, `Stress Tournament ${index} (${type})`, type);
  if (!created?._id) {
    return { index, type, ok: false, stage: "create" };
  }

  const guests = await Promise.all(
    Array.from({ length: PARTICIPANTS_PER_TOURNAMENT - 1 }, () => createGuest()),
  );
  await Promise.all(guests.map((g) => joinTournament(g, created._id)));

  const finalTournament = (await getTournament(created._id))?.data;
  const participantMap = new Map();
  for (const p of finalTournament?.participants ?? []) {
    const owner = guests.find((g) => g.username === p.name) ??
      (p.name === creator.username ? creator : null);
    if (owner) participantMap.set(String(p._id), owner);
  }

  const startRes = await startTournament(creator, created._id);
  if (startRes.status !== 200) {
    return { index, type, ok: false, stage: "start", detail: startRes.json };
  }

  let completed = false;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const matches = await getMatches(created._id);
    const reportable = matches.filter(
      (m) => m.status === "pending" || m.status === "in_progress",
    );

    if (reportable.length) {
      await Promise.all(
        reportable.flatMap((m) => {
          const p1 = participantMap.get(String(m.player1?.participantId));
          const p2 = participantMap.get(String(m.player2?.participantId));
          if (!p1 || !p2) return [];
          // Deterministic per match (not random) so a retried report — after the
          // loser of the write race gets a transient 500 — always resends the
          // same winner instead of manufacturing a false "disputed" match.
          const coinFlip = parseInt(String(m._id).slice(-1), 16) % 2;
          const winnerId =
            coinFlip === 0 ? String(m.player1.participantId) : String(m.player2.participantId);
          return [reportMatch(p1, m._id, winnerId), reportMatch(p2, m._id, winnerId)];
        }),
      );
    }

    const advanceRes = await advanceTournament(creator, created._id);
    if (advanceRes.json?.completed) {
      completed = true;
      break;
    }
    if (advanceRes.status !== 200 && !reportable.length) {
      break; // stuck: nothing to report and advance won't move forward
    }
  }

  return { index, type, ok: completed, tournamentId: created._id };
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(startedAt, results) {
  const byAction = new Map();
  for (const m of metrics) {
    if (!byAction.has(m.action)) byAction.set(m.action, []);
    byAction.get(m.action).push(m);
  }

  console.log("\n=== Stress test summary ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Tournaments: ${TOURNAMENT_COUNT}, participants each: ${PARTICIPANTS_PER_TOURNAMENT}`);
  console.log(`Wall clock: ${((performance.now() - startedAt) / 1000).toFixed(1)}s`);
  console.log(`Total HTTP requests: ${metrics.length}`);

  const completedCount = results.filter((r) => r?.ok).length;
  console.log(`Tournaments completed end-to-end: ${completedCount}/${TOURNAMENT_COUNT}`);
  for (const r of results) {
    if (!r?.ok) console.log(`  FAILED #${r?.index} (${r?.type}) at stage=${r?.stage ?? "lifecycle"}`);
  }

  console.log("\nBy action (count, errors, p50/p95/p99 ms):");
  const rows = [...byAction.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [action, entries] of rows) {
    const times = entries.map((e) => e.ms).sort((a, b) => a - b);
    const errors = entries.filter((e) => e.status >= 400).length;
    console.log(
      `  ${action.padEnd(20)} n=${String(entries.length).padEnd(6)} errors=${String(errors).padEnd(4)} ` +
        `p50=${percentile(times, 50).toFixed(0)}ms p95=${percentile(times, 95).toFixed(0)}ms p99=${percentile(times, 99).toFixed(0)}ms`,
    );
  }

  const errorSample = metrics.filter((m) => m.status >= 400 && m.status !== 403).slice(0, 10);
  if (errorSample.length) {
    console.log("\nSample non-CSRF errors (status codes):");
    console.log(errorSample.map((e) => `  ${e.action} -> ${e.status}`).join("\n"));
  }
}

async function main() {
  const startedAt = performance.now();
  console.log(
    `Starting stress run: ${TOURNAMENT_COUNT} tournaments x ${PARTICIPANTS_PER_TOURNAMENT} participants against ${BASE_URL}`,
  );
  const results = await Promise.all(
    Array.from({ length: TOURNAMENT_COUNT }, (_, i) => runTournamentFixture(i)),
  );
  summarize(startedAt, results);
}

main().catch((err) => {
  console.error("Stress test crashed:", err);
  process.exit(1);
});
