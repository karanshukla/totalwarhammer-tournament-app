/* ──────────────────────────────────────────────────────────────────────────
 * Showcase seed, part 2 — tournaments owned and played by a real account.
 *
 *   mongosh <db> --file seed-owner.js     (run seed-showcase.js first)
 *
 * Adds 3 tournaments created by the OWNER_USERNAME account, with them in the
 * bracket and a mix of wins and losses, and joins them to the two pending
 * seeded tournaments so their "my tournaments" list has open sign-ups in it.
 *
 * Opponents are the @seed.invalid users from seed-showcase.js, so everything
 * here is caught by that script's teardown too (it deletes any tournament
 * containing a seed participant).
 * ────────────────────────────────────────────────────────────────────────── */

const OWNER_USERNAME = "AnchorStandard";
const SEED_EMAIL = /@seed\.invalid$/;
const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000);
const hoursAgo = (h) => new Date(now - h * 3600000);

const owner = db.users.findOne({ username: OWNER_USERNAME }, { username: 1 });
if (!owner) {
  print(`ABORT — no user named ${OWNER_USERNAME}`);
  quit(1);
}
const OWNER = owner._id;
const OWNER_NAME = owner.username;

// ── undo a previous run of this script ────────────────────────────────────
const seedUserIds = db.users.distinct("_id", { email: SEED_EMAIL });
if (!seedUserIds.length) {
  print("ABORT — no @seed.invalid users found, run seed-showcase.js first");
  quit(1);
}

const priorIds = db.tournaments.distinct("_id", {
  createdBy: OWNER,
  "participants.userId": { $in: seedUserIds },
});
if (priorIds.length) {
  db.matches.deleteMany({ tournament: { $in: priorIds } });
  db.tournaments.deleteMany({ _id: { $in: priorIds } });
  print(`cleared ${priorIds.length} tournaments from a previous run`);
}
const unjoined = db.tournaments.updateMany(
  { createdBy: { $in: seedUserIds }, "participants.userId": OWNER },
  { $pull: { participants: { userId: OWNER } } },
);
if (unjoined.modifiedCount) {
  print(
    `removed prior sign-ups from ${unjoined.modifiedCount} seeded tournaments`,
  );
}

// ── resolve seed opponents ────────────────────────────────────────────────
const ROSTER = {
  wh3: [
    ["Karl Franz", "Empire"],
    ["Thorgrim Grudgebearer", "Dwarfs"],
    ["Grimgor Ironhide", "Greenskins"],
    ["Vlad von Carstein", "Vampire Counts"],
    ["Archaon the Everchosen", "Warriors of Chaos"],
    ["Durthu", "Wood Elves"],
    ["Louen Leoncoeur", "Bretonnia"],
    ["Tyrion", "High Elves"],
    ["Malekith", "Dark Elves"],
    ["Queek Headtaker", "Skaven"],
    ["Settra the Imperishable", "Tomb Kings"],
    ["Miao Ying", "Cathay"],
    ["Skarbrand", "Khorne"],
    ["Astragoth Ironhand", "Chaos Dwarfs"],
  ],
  "40k": [
    ["Marneus Calgar", "Adeptus Astartes"],
    ["Eldrad Ulthran", "Aeldari"],
    ["Ghazghkull Thraka", "Orks"],
    ["Imotekh the Stormlord", "Necrons"],
    ["Commander Shadowsun", "T'au Empire"],
    ["Magnus the Red", "Thousand Sons"],
    ["The Swarmlord", "Tyranids"],
    ["Chapter Master Dante", "Blood Angels"],
  ],
};

/** Seed usernames may have been suffixed on collision, so match the prefix. */
function seedUser(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const u = db.users.findOne({
    email: new RegExp(`^${slug}(_\\d+)?@seed\\.invalid$`),
  });
  if (!u) throw new Error(`seed user not found for "${name}"`);
  return u._id;
}

const opponents = {};
Object.keys(ROSTER).forEach((game) => {
  opponents[game] = ROSTER[game].map(([name, faction]) => ({
    userId: seedUser(name),
    name,
    faction,
  }));
});

// ── builders ──────────────────────────────────────────────────────────────
const usedCodes = new Set();
function newCode() {
  for (let i = 0; i < 100; i++) {
    const c = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (
      c.length === 6 &&
      !usedCodes.has(c) &&
      !db.tournaments.findOne({ code: c })
    ) {
      usedCodes.add(c);
      return c;
    }
  }
  throw new Error("could not allocate a unique tournament code");
}

const nameByParticipant = new Map();
function roster(entries) {
  return entries.map((e) => {
    const doc = {
      _id: new ObjectId(),
      userId: e.userId,
      name: e.name,
      faction: e.faction,
    };
    nameByParticipant.set(doc._id.toString(), e.name);
    return doc;
  });
}

const tournamentDocs = [];
const matchDocs = [];

function tournament(spec) {
  const doc = {
    _id: new ObjectId(),
    name: spec.name,
    code: newCode(),
    description: spec.description,
    playerCount: spec.playerCount ?? spec.participants.length,
    tournamentType: spec.type,
    bannedFactions: spec.bannedFactions ?? [],
    enable40kFactions: spec.is40k === true,
    participants: spec.participants,
    createdBy: OWNER,
    status: spec.status,
    createdAt: spec.createdAt,
    __v: 0,
  };
  tournamentDocs.push(doc);
  return doc;
}

const asSlot = (p, beta) => ({
  participantId: p._id,
  name: p.name,
  faction: p.faction,
  isBetaFaction: beta,
});

function match(t, round, matchNumber, p1, p2, opts) {
  const o = opts ?? {};
  const doc = {
    _id: new ObjectId(),
    tournament: t._id,
    round,
    matchNumber,
    player1: asSlot(p1, t.enable40kFactions),
    player2: asSlot(p2, t.enable40kFactions),
    winnerId: null,
    loserId: null,
    reportedResults: [],
    status: "pending",
    bracketSide: o.bracketSide ?? null,
    notes: o.notes ?? "",
    resultOverrides: [],
    createdAt: o.createdAt ?? t.createdAt,
    completedAt: null,
    __v: 0,
  };
  matchDocs.push(doc);
  return doc;
}

const report = (p, winner, when) => ({
  reportedBy: p._id,
  reportedByName: nameByParticipant.get(p._id.toString()),
  winnerId: winner._id,
  reportedAt: when,
});

function completed(m, p1, p2, winner, when) {
  const loser = winner === p1 ? p2 : p1;
  m.winnerId = winner._id;
  m.loserId = loser._id;
  m.status = "completed";
  m.completedAt = when;
  m.reportedResults = [report(p1, winner, when), report(p2, winner, when)];
  return winner;
}

function inProgress(m, reporter, claimedWinner, when) {
  m.status = "in_progress";
  m.reportedResults = [report(reporter, claimedWinner, when)];
}

function disputed(m, p1, p2, when) {
  m.status = "disputed";
  m.reportedResults = [report(p1, p1, when), report(p2, p2, when)];
}

const me = (faction) => ({ userId: OWNER, name: OWNER_NAME, faction });

// ══════════════════════════════════════════════════════════════════════════
// 1. Reikland Open — WH3 Single Elim, completed, he takes the title
// ══════════════════════════════════════════════════════════════════════════
{
  const o = opponents.wh3;
  const ps = roster([me("Kislev"), o[0], o[1], o[2], o[3], o[5], o[6], o[7]]);
  const t = tournament({
    name: "Reikland Open",
    description:
      "My eight-player Reikland ladder. Land battles, 2000 gold, siege maps off.",
    type: "Single Elimination",
    status: "completed",
    participants: ps,
    createdAt: daysAgo(34),
  });
  const wb = { bracketSide: "winners" };

  // He wins out: quarter, semi, final.
  const qf = [
    [ps[0], ps[1], ps[0]],
    [ps[2], ps[3], ps[2]],
    [ps[4], ps[5], ps[5]],
    [ps[6], ps[7], ps[6]],
  ].map(([a, b, w], i) =>
    completed(match(t, 1, i + 1, a, b, wb), a, b, w, daysAgo(33)),
  );

  const sf = [
    [qf[0], qf[1], qf[0]],
    [qf[2], qf[3], qf[3]],
  ].map(([a, b, w], i) =>
    completed(match(t, 2, i + 1, a, b, wb), a, b, w, daysAgo(32)),
  );

  const final = match(t, 3, 1, sf[0], sf[1], {
    ...wb,
    notes: "Final went the distance, 2-1 on the third map.",
  });
  completed(final, sf[0], sf[1], sf[0], daysAgo(31));
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Damnos Campaign — 40k Round Robin, active, he sits 2-1
// ══════════════════════════════════════════════════════════════════════════
{
  const o = opponents["40k"];
  const ps = roster([me("Adeptus Custodes"), o[0], o[1], o[3], o[4], o[5]]);
  const t = tournament({
    name: "Damnos Campaign",
    description:
      "Six commanders, five rounds, everyone plays everyone. Beta 40k rosters, 2000 points.",
    type: "Round Robin",
    status: "active",
    is40k: true,
    participants: ps,
    createdAt: daysAgo(13),
  });

  const fixed = ps[0];
  const rotating = ps.slice(1);
  const n = ps.length;
  const mine = [];
  for (let r = 0; r < n - 1; r++) {
    const order = [fixed].concat(rotating);
    for (let i = 0; i < n / 2; i++) {
      const p1 = order[i];
      const p2 = order[n - 1 - i];
      const m = match(t, r + 1, i + 1, p1, p2);
      const isMine = p1 === ps[0] || p2 === ps[0];
      if (r < 3) {
        // Round 2 is his one loss so far; otherwise he wins.
        const winner = isMine
          ? r === 1
            ? p1 === ps[0]
              ? p2
              : p1
            : ps[0]
          : (r + i) % 3 === 0
            ? p2
            : p1;
        completed(m, p1, p2, winner, daysAgo(11 - r * 2));
      } else if (isMine && !mine.length) {
        inProgress(m, ps[0], ps[0], hoursAgo(7));
        mine.push(m);
      }
    }
    rotating.unshift(rotating.pop());
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Sigmar's Trial — WH3 Swiss, active, his round 2 is disputed
// ══════════════════════════════════════════════════════════════════════════
{
  const o = opponents.wh3;
  const ps = roster([
    me("Empire"),
    o[8],
    o[9],
    o[10],
    o[11],
    o[12],
    o[13],
    o[4],
  ]);
  const t = tournament({
    name: "Sigmar's Trial",
    description:
      "Three Swiss rounds, pairings by score. Khorne is banned, everything else is fair game.",
    type: "Swiss System",
    status: "active",
    bannedFactions: ["Khorne"],
    participants: ps,
    createdAt: daysAgo(4),
  });

  const r1 = [
    [ps[0], ps[1], ps[0]],
    [ps[2], ps[3], ps[3]],
    [ps[4], ps[5], ps[4]],
    [ps[6], ps[7], ps[7]],
  ].map(([a, b, w], i) =>
    completed(match(t, 1, i + 1, a, b), a, b, w, daysAgo(3)),
  );

  disputed(match(t, 2, 1, ps[0], r1[1]), ps[0], r1[1], hoursAgo(16));
  completed(match(t, 2, 2, r1[2], r1[3]), r1[2], r1[3], r1[2], hoursAgo(14));
  inProgress(match(t, 2, 3, ps[1], ps[2]), ps[1], ps[1], hoursAgo(4));
  match(t, 2, 4, ps[5], ps[6]);
}

// ── join him to the pending seeded tournaments ────────────────────────────
const pendingSeeded = db.tournaments
  .find(
    { createdBy: { $in: seedUserIds }, status: "pending" },
    { name: 1, enable40kFactions: 1, participants: 1, playerCount: 1 },
  )
  .toArray();

pendingSeeded.forEach((t) => {
  if (t.participants.length >= t.playerCount) return;
  const taken = new Set(t.participants.map((p) => p.faction));
  const faction = t.enable40kFactions
    ? (["Adeptus Custodes", "13th Company (Space Wolves)", "Necrons"].find(
        (f) => !taken.has(f),
      ) ?? "Adeptus Custodes")
    : (["Kislev", "Empire", "Dwarfs"].find((f) => !taken.has(f)) ?? "Kislev");
  db.tournaments.updateOne(
    { _id: t._id },
    {
      $push: {
        participants: {
          _id: new ObjectId(),
          userId: OWNER,
          name: OWNER_NAME,
          faction,
        },
      },
    },
  );
  print(`joined "${t.name}" as ${faction}`);
});

// ── write ─────────────────────────────────────────────────────────────────
db.tournaments.insertMany(tournamentDocs);
db.matches.insertMany(matchDocs);

print(
  `seeded ${tournamentDocs.length} tournaments and ${matchDocs.length} matches for ${OWNER_NAME}`,
);
tournamentDocs.forEach((t) =>
  print(
    `  ${t.code}  ${(t.enable40kFactions ? "40k" : "wh3").padEnd(4)} ${t.status.padEnd(9)} ${t.tournamentType.padEnd(20)} ${t.name}`,
  ),
);
