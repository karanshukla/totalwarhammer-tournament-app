/* ──────────────────────────────────────────────────────────────────────────
 * Total Warhammer tournament app — showcase seed (WH3 + 40k)
 *
 *   mongosh "$MONGO_URI" --file seed-showcase.js
 *
 * Creates 40 seed users (email @seed.invalid, no password → cannot log in),
 * 10 tournaments and their matches, covering both game systems, every
 * tournament type, and every match state (pending / in_progress / completed /
 * disputed / overridden).
 *
 * A tournament is played under exactly one game system (see
 * faction-eligibility-service.js), so 40k tournaments carry
 * enable40kFactions: true, a 40k-only roster, and isBetaFaction: true on every
 * player slot — matching what slot() in tournament-service.js writes.
 *
 * Idempotent: it deletes everything from a previous run first, and only ever
 * touches documents that trace back to an @seed.invalid user. Teardown snippet
 * is at the bottom of this file.
 * ────────────────────────────────────────────────────────────────────────── */

const SEED_EMAIL = /@seed\.invalid$/;
const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000);
const hoursAgo = (h) => new Date(now - h * 3600000);

// ── wipe any previous seed run ────────────────────────────────────────────
const priorUserIds = db.users
  .find({ email: SEED_EMAIL }, { _id: 1 })
  .toArray()
  .map((u) => u._id);

if (priorUserIds.length) {
  // Also catches tournaments owned by a real account that seed users played in
  // (see seed-karan.js), so one teardown removes the whole showcase.
  const priorTournamentIds = db.tournaments
    .find(
      {
        $or: [
          { createdBy: { $in: priorUserIds } },
          { "participants.userId": { $in: priorUserIds } },
        ],
      },
      { _id: 1 },
    )
    .toArray()
    .map((t) => t._id);
  db.matches.deleteMany({ tournament: { $in: priorTournamentIds } });
  db.tournaments.deleteMany({ _id: { $in: priorTournamentIds } });
  db.users.deleteMany({ _id: { $in: priorUserIds } });
  print(
    `cleared previous seed: ${priorUserIds.length} users, ${priorTournamentIds.length} tournaments`,
  );
}

// ── rosters ───────────────────────────────────────────────────────────────
const ROSTER_WH3 = [
  ["Karl Franz", "Empire"],
  ["Thorgrim Grudgebearer", "Dwarfs"],
  ["Grimgor Ironhide", "Greenskins"],
  ["Vlad von Carstein", "Vampire Counts"],
  ["Archaon the Everchosen", "Warriors of Chaos"],
  ["Khazrak One-Eye", "Beastmen"],
  ["Durthu", "Wood Elves"],
  ["Louen Leoncoeur", "Bretonnia"],
  ["Wulfrik the Wanderer", "Norsca"],
  ["Tyrion", "High Elves"],
  ["Malekith", "Dark Elves"],
  ["Lord Mazdamundi", "Lizardmen"],
  ["Queek Headtaker", "Skaven"],
  ["Settra the Imperishable", "Tomb Kings"],
  ["Luthor Harkon", "Vampire Coast"],
  ["Tzarina Katarin", "Kislev"],
  ["Miao Ying", "Cathay"],
  ["Greasus Goldtooth", "Ogre Kingdoms"],
  ["Skarbrand", "Khorne"],
  ["Astragoth Ironhand", "Chaos Dwarfs"],
];

const ROSTER_40K = [
  ["Marneus Calgar", "Adeptus Astartes"],
  ["Eldrad Ulthran", "Aeldari"],
  ["Ghazghkull Thraka", "Orks"],
  ["Belisarius Cawl", "Adeptus Mechanicus"],
  ["Imotekh the Stormlord", "Necrons"],
  ["Ursula Creed", "Astra Militarum"],
  ["Abaddon the Despoiler", "Heretic Astartes"],
  ["Solitaire Sylandri", "Harlequins"],
  ["Yvraine the Emissary", "Ynnari"],
  ["Commander Shadowsun", "T'au Empire"],
  ["Commander Farsight", "Farsight Enclaves"],
  ["Drazhar the Executioner", "Drukhari"],
  ["Morvenn Vahl", "Adepta Sororitas"],
  ["The Swarmlord", "Tyranids"],
  ["High Marshal Helbrecht", "Black Templars"],
  ["Chapter Master Dante", "Blood Angels"],
  ["Supreme Master Azrael", "Dark Angels"],
  ["Typhus the Traveller", "Death Guard"],
  ["Magnus the Red", "Thousand Sons"],
  ["Angron the Red Angel", "World Eaters"],
];

const toPool = (roster) =>
  roster.map(([name, faction]) => ({
    userId: new ObjectId(),
    username: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    name,
    faction,
  }));

const wh3 = toPool(ROSTER_WH3);
const w40k = toPool(ROSTER_40K);
const pool = wh3.concat(w40k);

// Seed usernames are cosmetic, so on a clash with a real account rename the
// seed one rather than aborting the whole run.
const taken = new Set(
  db.users
    .find({ username: { $in: pool.map((p) => p.username) } }, { username: 1 })
    .toArray()
    .map((u) => u.username),
);
pool.forEach((p) => {
  if (!taken.has(p.username)) return;
  const original = p.username;
  let i = 2;
  while (
    taken.has(`${original}_${i}`) ||
    db.users.findOne({ username: `${original}_${i}` })
  )
    i++;
  p.username = `${original}_${i}`;
  taken.add(p.username);
  print(
    `renamed seed user ${original} → ${p.username} (username already taken)`,
  );
});

const userDocs = pool.map((p, i) => ({
  _id: p.userId,
  username: p.username,
  email: `${p.username}@seed.invalid`,
  createdAt: daysAgo(150 - i * 2),
  passwordChangedAt: null,
  __v: 0,
}));

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

const handleByParticipant = new Map();
function participantsFrom(slice) {
  return slice.map((p) => {
    const doc = {
      _id: new ObjectId(),
      userId: p.userId,
      name: p.name,
      faction: p.faction,
    };
    handleByParticipant.set(doc._id.toString(), p.username);
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
    createdBy: spec.createdBy,
    status: spec.status,
    createdAt: spec.createdAt,
    __v: 0,
  };
  tournamentDocs.push(doc);
  return doc;
}

const asSlot = (p, isBetaFaction) => ({
  participantId: p._id,
  name: p.name,
  faction: p.faction,
  isBetaFaction,
});

function match(t, round, matchNumber, p1, p2, opts) {
  const o = opts ?? {};
  const beta = t.enable40kFactions;
  const doc = {
    _id: new ObjectId(),
    tournament: t._id,
    round,
    matchNumber,
    player1: asSlot(p1, beta),
    player2: asSlot(p2, beta),
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
  reportedByName: handleByParticipant.get(p._id.toString()),
  winnerId: winner._id,
  reportedAt: when,
});

/** Both players agree → completed. Returns the winner, for bracket chaining. */
function completed(m, p1, p2, winner, when) {
  const loser = winner === p1 ? p2 : p1;
  m.winnerId = winner._id;
  m.loserId = loser._id;
  m.status = "completed";
  m.completedAt = when;
  m.reportedResults = [report(p1, winner, when), report(p2, winner, when)];
  return winner;
}

/** One player has reported, waiting on the other. */
function inProgress(m, reporter, claimedWinner, when) {
  m.status = "in_progress";
  m.reportedResults = [report(reporter, claimedWinner, when)];
}

/** Both players claim themselves → disputed, awaiting creator resolution. */
function disputed(m, p1, p2, when) {
  m.status = "disputed";
  m.reportedResults = [report(p1, p1, when), report(p2, p2, when)];
}

/** Creator overrode the recorded winner (surfaces the reason popover). */
function overridden(m, newWinner, previousWinner, by, reason, when) {
  m.resultOverrides = [
    {
      previousWinnerId: previousWinner ? previousWinner._id : null,
      newWinnerId: newWinner._id,
      overriddenBy: by,
      reason,
      overriddenAt: when,
    },
  ];
  m.winnerId = newWinner._id;
  m.loserId =
    m.player1.participantId.toString() === newWinner._id.toString()
      ? m.player2.participantId
      : m.player1.participantId;
  m.status = "completed";
  m.completedAt = m.completedAt ?? when;
}

/**
 * Play out a full single-elim bracket. `picks` is one array per round of 0/1,
 * choosing player1 or player2 as the winner. Returns the rounds it built.
 */
function playSingleElim(t, ps, picks, startDaysAgo) {
  const rounds = [];
  let field = ps;
  picks.forEach((roundPicks, r) => {
    const winners = [];
    const built = [];
    for (let i = 0; i < field.length; i += 2) {
      const a = field[i];
      const b = field[i + 1];
      const m = match(t, r + 1, i / 2 + 1, a, b, { bracketSide: "winners" });
      built.push(m);
      winners.push(
        completed(
          m,
          a,
          b,
          roundPicks[i / 2] === 0 ? a : b,
          daysAgo(startDaysAgo - r),
        ),
      );
    }
    rounds.push(built);
    field = winners;
  });
  return { rounds, champion: field[0] };
}

/**
 * Circle-method round robin, mirroring roundRobinStart. Completes the first
 * `completedRounds` rounds and returns every fixture for further tweaking.
 */
function playRoundRobin(t, ps, completedRounds, startDaysAgo) {
  const fixed = ps[0];
  const rotating = ps.slice(1);
  const n = ps.length;
  const fixtures = [];
  for (let r = 0; r < n - 1; r++) {
    const order = [fixed].concat(rotating);
    for (let i = 0; i < n / 2; i++) {
      const p1 = order[i];
      const p2 = order[n - 1 - i];
      const m = match(t, r + 1, i + 1, p1, p2);
      fixtures.push({ m, p1, p2, round: r + 1 });
      if (r < completedRounds) {
        completed(
          m,
          p1,
          p2,
          (r + i) % 3 === 0 ? p2 : p1,
          daysAgo(startDaysAgo - r * 2),
        );
      }
    }
    rotating.unshift(rotating.pop());
  }
  return fixtures;
}

// ══════════════════════════════════════════════════════════════════════════
// WARHAMMER III
// ══════════════════════════════════════════════════════════════════════════

// 1. Completed 8-player Single Elimination
{
  const ps = participantsFrom(wh3.slice(0, 8));
  const t = tournament({
    name: "Grand Cathayan Invitational",
    description:
      "Eight champions, one Dragon Throne. Land battles, 2000 gold, no siege maps.",
    type: "Single Elimination",
    status: "completed",
    participants: ps,
    createdBy: ps[0].userId,
    createdAt: daysAgo(28),
  });
  const { rounds } = playSingleElim(t, ps, [[0, 1, 0, 1], [1, 0], [0]], 27);
  rounds[2][0].notes = "Championship final — best of three, streamed.";
}

// 2. Active 8-player Single Elimination — round 2 live, one dispute
{
  const ps = participantsFrom(wh3.slice(4, 12));
  const t = tournament({
    name: "Chaos Wastes Open",
    description:
      "Open bracket, no faction restrictions. Report your own results — disputes go to the organiser.",
    type: "Single Elimination",
    status: "active",
    participants: ps,
    createdBy: ps[0].userId,
    createdAt: daysAgo(6),
  });
  const wb = { bracketSide: "winners" };
  const r1 = [
    [ps[0], ps[1], 1],
    [ps[2], ps[3], 0],
    [ps[4], ps[5], 1],
    [ps[6], ps[7], 0],
  ].map(([a, b, w], i) =>
    completed(match(t, 1, i + 1, a, b, wb), a, b, w === 0 ? a : b, daysAgo(5)),
  );

  disputed(match(t, 2, 1, r1[0], r1[1], wb), r1[0], r1[1], hoursAgo(5));
  inProgress(match(t, 2, 2, r1[2], r1[3], wb), r1[2], r1[2], hoursAgo(2));
}

// 3. Active 6-player Round Robin — three of five rounds played
{
  const ps = participantsFrom(wh3.slice(10, 16));
  const t = tournament({
    name: "Skavenblight League",
    description:
      "Six warlords, five rounds, everyone plays everyone. Highest win count takes the season.",
    type: "Round Robin",
    status: "active",
    participants: ps,
    createdBy: ps[2].userId,
    createdAt: daysAgo(14),
  });
  playRoundRobin(t, ps, 3, 12);
}

// 4. Active 8-player Double Elimination — WB round 1 done, LB seeded
{
  const ps = participantsFrom(wh3.slice(8, 16));
  const t = tournament({
    name: "Ulthuan Winter Clash",
    description:
      "Double elimination — one loss puts you in the underway, two sends you home.",
    type: "Double Elimination",
    status: "active",
    participants: ps,
    createdBy: ps[1].userId,
    createdAt: daysAgo(3),
  });
  const winners = [];
  const losers = [];
  [
    [ps[0], ps[1], 0],
    [ps[2], ps[3], 1],
    [ps[4], ps[5], 0],
    [ps[6], ps[7], 1],
  ].forEach(([a, b, w], i) => {
    const m = match(t, 1, i + 1, a, b, { bracketSide: "winners" });
    const win = completed(m, a, b, w === 0 ? a : b, daysAgo(2));
    winners.push(win);
    losers.push(win === a ? b : a);
  });
  match(t, 2, 1, winners[0], winners[1], { bracketSide: "winners" });
  match(t, 2, 2, winners[2], winners[3], { bracketSide: "winners" });
  match(t, 1, 1, losers[0], losers[1], { bracketSide: "losers" });
  match(t, 1, 2, losers[2], losers[3], { bracketSide: "losers" });
}

// 5. Active 8-player Swiss — two rounds in, one overridden result
{
  const ps = participantsFrom(wh3.slice(12, 20));
  const organiser = ps[0];
  const t = tournament({
    name: "Border Princes Swiss",
    description:
      "Three Swiss rounds, pairings by score. Chaos Dwarfs and Khorne are banned this season.",
    type: "Swiss System",
    status: "active",
    bannedFactions: ["Chaos Dwarfs", "Khorne"],
    participants: ps,
    createdBy: organiser.userId,
    createdAt: daysAgo(9),
  });
  const r1 = [
    [ps[0], ps[1], 0],
    [ps[2], ps[3], 0],
    [ps[4], ps[5], 1],
    [ps[6], ps[7], 1],
  ].map(([a, b, w], i) => {
    const m = match(t, 1, i + 1, a, b);
    return { m, winner: completed(m, a, b, w === 0 ? a : b, daysAgo(8)) };
  });

  overridden(
    r1[2].m,
    ps[4],
    r1[2].winner,
    organiser.userId,
    "Replay review: opponent conceded before the timer expired, result reversed.",
    daysAgo(7),
  );

  completed(
    match(t, 2, 1, r1[0].winner, r1[1].winner),
    r1[0].winner,
    r1[1].winner,
    r1[1].winner,
    daysAgo(6),
  );
  completed(
    match(t, 2, 2, ps[4], r1[3].winner),
    ps[4],
    r1[3].winner,
    ps[4],
    daysAgo(6),
  );
  inProgress(match(t, 2, 3, ps[1], ps[3]), ps[1], ps[1], hoursAgo(20));
  match(t, 2, 4, ps[5], ps[7]);
}

// 6. Pending — open for sign-ups, 5 of 16 slots filled
{
  const ps = participantsFrom(wh3.slice(2, 7));
  tournament({
    name: "Old World Grand Tournament",
    description:
      "Sixteen-player open. Sign-ups close Friday — bring a list, land battles only.",
    type: "Single Elimination",
    status: "pending",
    playerCount: 16,
    participants: ps,
    createdBy: ps[0].userId,
    createdAt: daysAgo(1),
  });
}

// ══════════════════════════════════════════════════════════════════════════
// WARHAMMER 40,000  (enable40kFactions: true — 40k rosters only)
// ══════════════════════════════════════════════════════════════════════════

// 7. Completed 8-player Single Elimination
{
  const ps = participantsFrom(w40k.slice(0, 8));
  const t = tournament({
    name: "Sector Imperialis Invitational",
    description:
      "Eight commanders fight for the sector. Beta 40k rosters, 2000 points, no fortifications.",
    type: "Single Elimination",
    status: "completed",
    is40k: true,
    participants: ps,
    createdBy: ps[5].userId,
    createdAt: daysAgo(21),
  });
  const { rounds } = playSingleElim(t, ps, [[1, 0, 0, 1], [0, 1], [1]], 20);
  rounds[2][0].notes =
    "Grand final — held on Armageddon Secundus, full VOD on the Discord.";
}

// 8. Active 8-player Double Elimination — deep into both brackets
{
  const ps = participantsFrom(w40k.slice(4, 12));
  const t = tournament({
    name: "Cadian Gate Gauntlet",
    description:
      "Double elimination through the Cadian Gate. Tyranids and Chaos Daemons are banned this season.",
    type: "Double Elimination",
    status: "active",
    is40k: true,
    bannedFactions: ["Tyranids", "Chaos Daemons"],
    participants: ps,
    createdBy: ps[0].userId,
    createdAt: daysAgo(11),
  });

  const wbWinners = [];
  const wbLosers = [];
  [
    [ps[0], ps[1], 0],
    [ps[2], ps[3], 1],
    [ps[4], ps[5], 1],
    [ps[6], ps[7], 0],
  ].forEach(([a, b, w], i) => {
    const m = match(t, 1, i + 1, a, b, { bracketSide: "winners" });
    const win = completed(m, a, b, w === 0 ? a : b, daysAgo(10));
    wbWinners.push(win);
    wbLosers.push(win === a ? b : a);
  });

  // WB round 2 played out; losers drop into LB round 2.
  const wbFinalists = [];
  const wbDropouts = [];
  [
    [wbWinners[0], wbWinners[1], 1],
    [wbWinners[2], wbWinners[3], 0],
  ].forEach(([a, b, w], i) => {
    const m = match(t, 2, i + 1, a, b, { bracketSide: "winners" });
    const win = completed(m, a, b, w === 0 ? a : b, daysAgo(8));
    wbFinalists.push(win);
    wbDropouts.push(win === a ? b : a);
  });

  // LB round 1 played out between the four WB round-1 losers.
  const lbSurvivors = [];
  [
    [wbLosers[0], wbLosers[1], 0],
    [wbLosers[2], wbLosers[3], 1],
  ].forEach(([a, b, w], i) => {
    const m = match(t, 1, i + 1, a, b, { bracketSide: "losers" });
    lbSurvivors.push(completed(m, a, b, w === 0 ? a : b, daysAgo(9)));
  });

  match(t, 3, 1, wbFinalists[0], wbFinalists[1], { bracketSide: "winners" });
  const lb1 = match(t, 2, 1, lbSurvivors[0], wbDropouts[0], {
    bracketSide: "losers",
  });
  inProgress(lb1, lbSurvivors[0], lbSurvivors[0], hoursAgo(9));
  match(t, 2, 2, lbSurvivors[1], wbDropouts[1], { bracketSide: "losers" });
}

// 9. Active 6-player Round Robin — mid-season, one fixture disputed
{
  const ps = participantsFrom(w40k.slice(10, 16));
  const t = tournament({
    name: "Armageddon Steel Legion Open",
    description:
      "Six commanders, five rounds, everyone plays everyone. Ties broken by head-to-head.",
    type: "Round Robin",
    status: "active",
    is40k: true,
    participants: ps,
    createdBy: ps[3].userId,
    createdAt: daysAgo(16),
  });
  const fixtures = playRoundRobin(t, ps, 3, 14);
  const round4 = fixtures.filter((f) => f.round === 4);
  disputed(round4[0].m, round4[0].p1, round4[0].p2, hoursAgo(30));
  inProgress(round4[1].m, round4[1].p1, round4[1].p2, hoursAgo(12));
}

// 10. Pending 40k — open for sign-ups, 6 of 16 slots filled
{
  const ps = participantsFrom(w40k.slice(13, 19));
  tournament({
    name: "Waaagh! Grand Melee",
    description:
      "Sixteen-slot 40k open, beta rosters welcome. Sign-ups close when the Waaagh! kicks off.",
    type: "Swiss System",
    status: "pending",
    is40k: true,
    playerCount: 16,
    participants: ps,
    createdBy: ps[0].userId,
    createdAt: hoursAgo(14),
  });
}

// ── write ─────────────────────────────────────────────────────────────────
db.users.insertMany(userDocs);
db.tournaments.insertMany(tournamentDocs);
db.matches.insertMany(matchDocs);

print(
  `seeded ${userDocs.length} users, ${tournamentDocs.length} tournaments, ${matchDocs.length} matches`,
);
tournamentDocs.forEach((t) =>
  print(
    `  ${t.code}  ${(t.enable40kFactions ? "40k" : "wh3").padEnd(4)} ${t.status.padEnd(9)} ${t.tournamentType.padEnd(20)} ${t.name}`,
  ),
);

/* ── TEARDOWN — run this to remove everything the seed created ─────────────
const ids = db.users.find({ email: /@seed\.invalid$/ }, { _id: 1 }).toArray().map(u => u._id);
const ts  = db.tournaments.distinct("_id", { $or: [{ createdBy: { $in: ids } }, { "participants.userId": { $in: ids } }] });
db.matches.deleteMany({ tournament: { $in: ts } });
db.tournaments.deleteMany({ _id: { $in: ts } });
db.users.deleteMany({ _id: { $in: ids } });
─────────────────────────────────────────────────────────────────────────── */
