// Verifies the bracket mapping against ESPN's own payload.
//
// The rules this checks are the ones that broke silently once already:
//   1. the tie winner matches what ESPN says in the match note
//      ("X Gana 3-2 en el global", "X avanza 6-5 en tiros de penal");
//   2. a single-match tie matches the event winner flag;
//   3. the aggregate the UI computes equals ESPN's series aggregateScore;
//   4. the shoot-out digits belong to the side that won them.
//
// Run it with the dev server up (it reads the API and ESPN directly):
//
//   npm run dev
//   node scripts/verify-bracket.mjs
//
// API_BASE overrides the dev server URL. No dependencies, no test runner:
// the repo has none, and this check needs live ESPN data to be meaningful.

const API_BASE = process.env.API_BASE ?? "http://localhost:4321";
const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const COMPETITIONS = {
  libertadores: { slug: "conmebol.libertadores" },
  sudamericana: { slug: "conmebol.sudamericana" },
  "copa-argentina": { slug: "arg.copa" },
};

/** ESPN's Spanish note names the winner right before the digits. */
const NOTE_WINNER = /(?:juego de vuelta\s*-\s*)?(?:empatados en el global\s*-\s*)?(.+?)\s+(?:gana|avanza)/i;

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function teamNames(team) {
  return [team?.abbreviation, team?.shortDisplayName, team?.displayName]
    .filter(Boolean)
    .map(normalize);
}

async function getJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "MiXteam/2.0 (+portfolio project)" } });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.json();
}

/** Team id -> names, taken from the raw ESPN events. */
function indexTeams(events) {
  const teams = new Map();
  for (const event of events) {
    for (const competitor of event.competitions?.[0]?.competitors ?? []) {
      const id = String(competitor.team?.id ?? "");
      if (id) teams.set(id, competitor.team);
    }
  }
  return teams;
}

/** The team the tie note names as the qualifier. */
function winnerFromNote(note, teams, legIds) {
  const match = NOTE_WINNER.exec(String(note ?? ""));
  if (!match) return "";
  const wanted = normalize(match[1]);
  for (const id of legIds) {
    const team = teams.get(String(id));
    if (!team) continue;
    if (teamNames(team).includes(wanted)) return String(id);
  }
  return "";
}

/** ESPN's aggregate for a finished series, keyed by team id. */
function seriesAggregate(event) {
  const totals = new Map();
  for (const competitor of event?.competitions?.[0]?.series?.competitors ?? []) {
    const raw = competitor.aggregateScore;
    if (raw === null || raw === undefined || raw === "") continue;
    totals.set(String(competitor.id), Number(raw));
  }
  return totals;
}

/** The aggregate the UI computes: legs sum up, swapping the venue swap. */
function uiAggregate(legs, homeId, awayId) {
  const totals = { [homeId]: 0, [awayId]: 0 };
  for (const leg of legs) {
    const homeGoals = Number(leg.homeScore);
    const awayGoals = Number(leg.awayScore);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;
    if (String(leg.homeId) === awayId) {
      totals[homeId] += awayGoals;
      totals[awayId] += homeGoals;
      continue;
    }
    totals[homeId] += homeGoals;
    totals[awayId] += awayGoals;
  }
  return totals;
}

async function verify(competition, config, failures) {
  const [api, season] = await Promise.all([
    getJson(`${API_BASE}/api/bracket?competition=${competition}`),
    getJson(`${ESPN_SITE}/${config.slug}/scoreboard?dates=2026&limit=500&lang=es`),
  ]);

  const events = new Map((season.events ?? []).map((event) => [String(event.id), event]));
  const teams = indexTeams(season.events ?? []);

  let checked = 0;
  for (const round of api.rounds ?? []) {
    for (const tie of round.ties ?? []) {
      const legs = tie.legs ?? [];
      if (legs.length === 0) continue;
      const legIds = legs.flatMap((leg) => [leg.homeId, leg.awayId]);
      const label = `${round.title}: ${legs[0].home} vs ${legs[0].away}`;

      // 1 + 2 — who advanced.
      const fromNote = winnerFromNote(tie.note, teams, legIds);
      let expected = fromNote;
      if (!expected && legs.length === 1) {
        const event = events.get(String(legs[0].id));
        const flagged = (event?.competitions?.[0]?.competitors ?? []).find((c) => c?.winner);
        expected = String(flagged?.team?.id ?? "");
      }
      if (expected && String(tie.winnerId ?? "") !== expected) {
        failures.push(`${label} — api dice ${tie.winnerId}, ESPN dice ${expected} ("${tie.note}")`);
      }
      if (expected) checked++;

      // 3 — the aggregate the UI shows equals ESPN's aggregate.
      if (legs.length > 1 && tie.status === "completed") {
        const last = events.get(String(legs[legs.length - 1].id));
        const totals = seriesAggregate(last);
        const homeId = String(legs[0].homeId);
        const awayId = String(legs[0].awayId);
        const expectedHome = totals.get(homeId);
        const expectedAway = totals.get(awayId);
        if (expectedHome !== undefined && expectedAway !== undefined) {
          const actual = uiAggregate(legs, homeId, awayId);
          if (actual[homeId] !== expectedHome || actual[awayId] !== expectedAway) {
            failures.push(
              `${label} — global ${actual[homeId]}-${actual[awayId]}, ESPN ${expectedHome}-${expectedAway}`
            );
          }
        }
      }

      // 4 — the shoot-out digits belong to the side that won them.
      const leg = legs.find((l) => l.pensHome !== undefined && l.pensAway !== undefined);
      if (leg) {
        const homePens = Number(leg.pensHome);
        const awayPens = Number(leg.pensAway);
        const winnerIsHome = String(tie.winnerId) === String(leg.homeId);
        const winnerIsAway = String(tie.winnerId) === String(leg.awayId);
        if (!((winnerIsHome && homePens > awayPens) || (winnerIsAway && awayPens > homePens))) {
          failures.push(
            `${label} — Lonely ${homePens}-${awayPens} pero ganó ${tie.winnerId}`
          );
        }
      }
    }
  }

  const rounds = (api.rounds ?? [])
    .map((round) => `${round.title} ${round.ties.length}`)
    .join(", ");
  console.log(`  ${competition}: ${checked} cruces verificados | ${rounds}`);
}

const failures = [];
for (const [competition, config] of Object.entries(COMPETITIONS)) {
  try {
    await verify(competition, config, failures);
  } catch (error) {
    failures.push(`${competition} — ${error?.message ?? error}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} discrepancias:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nTodo coincide con ESPN.");
