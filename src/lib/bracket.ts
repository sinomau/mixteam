// Knockout bracket for the cup pages, served by /api/bracket.
//
// We rebuild the whole "llaves" picture from ONE ESPN season scoreboard — the
// same zero-key pattern as /api/football. ESPN exposes no bracket resource for
// these cups: the round, the leg number and the series aggregate only exist as
// metadata on the event, so the events are the data.
//
// `?dates=<year>&limit=500` returns the entire season in a single request
// (verified 2026-11-08: 155 events for Libertadores). Per-day probing was the
// first approach and worked, but ~150 requests per refresh let ESPN's Akamai
// edge start fingerprint-blocking our traffic; one season request per 30 min
// cache is a rounding error by comparison.
//
// Everything here is defensive on purpose. These feeds are undocumented and
// change shape between rounds and seasons, so a missing series, leg, note or
// competitor must degrade to "less information", never to a thrown error.

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/**
 * Snapshot window per competition: which events make it into the bracket.
 * The season fetch downloads everything; this filter trims it.
 *
 * Reach: from the window start to today, plus the small lookahead below.
 *
 * The window used to be a cost decision — one request per day — so Copa
 * Argentina was truncated to Round of 16. The transport now asks for the whole
 * season in ONE request, so the extra rounds cost nothing but a few lines of
 * JSON and the whole tree is shown: R64 (32 ties) through the final.
 *
 * Libertadores/Sudamericana 2026 knockouts start on 1 July (Round of 16), so
 * their window covers Jul-Dec; their qualifying and group stages (Feb-May)
 * stay outside it. Copa Argentina's 64-team tree starts on 18 Jan 2026, so its
 * window opens on 1 Jan.
 *
 * The window is pinned to the current edition (2026). A new edition moves it.
 */
const COMPETITIONS = {
  libertadores: {
    slug: "conmebol.libertadores",
    name: "Copa Libertadores",
    windowStart: "20260701",
  },
  sudamericana: {
    slug: "conmebol.sudamericana",
    name: "Copa Sudamericana",
    windowStart: "20260701",
  },
  "copa-argentina": {
    slug: "arg.copa",
    name: "Copa Argentina",
    windowStart: "20260101",
  },
} as const;

export type CompetitionKey = keyof typeof COMPETITIONS;

export function isCompetitionKey(value: string): value is CompetitionKey {
  return Object.prototype.hasOwnProperty.call(COMPETITIONS, value);
}

/**
 * Reach past today. Scheduled ties must already render as pending (S6: the
 * final is its own round before kickoff — the 2026 Sudamericana final on
 * 21 Nov, Libertadores final on 28 Nov, Copa Argentina final on 2 Dec). Thirty
 * days covers those without touching placeholders: ESPN lists the Copa
 * Argentina final with "TBD Home"/"TBD Away" sides, which we skip. Set to 0 to
 * cut at today.
 */
const PROBE_FUTURE_DAYS = 30;

/** English series title -> Spanish round title (S4 copy). */
const ROUND_TITLES: Record<string, string> = {
  "Round of 64": "Treintaidosavos de final",
  "Round of 32": "Dieciseisavos de final",
  "Round of 16": "Octavos de final",
  Quarterfinals: "Cuartos de final",
  Semifinals: "Semifinales",
  "Knockout Round Playoffs": "Repechaje",
  final: "Final",
};

/** Bracket order; unknown round keys are appended after these, by date. */
const ROUND_ORDER = [
  "Knockout Round Playoffs",
  "Round of 64",
  "Round of 32",
  "Round of 16",
  "Quarterfinals",
  "Semifinals",
  "final",
];

/**
 * ESPN `season.slug` -> canonical English round key. The cups carry the round
 * in `series.title` (English even with lang=es), but Copa Argentina has no
 * series at all, so its season slug is the reliable English key.
 */
const SEASON_SLUG_ROUNDS: Record<string, string> = {
  "round-of-64": "Round of 64",
  "round-of-32": "Round of 32",
  "round-of-16": "Round of 16",
  quarterfinals: "Quarterfinals",
  semifinals: "Semifinals",
  final: "final",
};

/**
 * Round suffix -> canonical key. `altGameNote` is "<competition>, <round>" and
 * IS localized by lang=es ("Copa ARG, Ronda de 16"), so both languages are
 * accepted. Keys are accent-stripped and lowercased.
 */
const ROUND_SUFFIXES: Record<string, string> = {
  // Spanish (verified 2026).
  "ronda de 64": "Round of 64",
  "ronda de 32": "Round of 32",
  "ronda de 16": "Round of 16",
  "treintaidosavos de final": "Round of 64",
  "dieciseisavos de final": "Round of 32",
  "octavos de final": "Round of 16",
  "cuartos de final": "Quarterfinals",
  semifinales: "Semifinals",
  repechaje: "Knockout Round Playoffs",
  "playoffs de acceso a octavos": "Knockout Round Playoffs",
  final: "final",
  // English (fallback when ESPN does not localize).
  "round of 64": "Round of 64",
  "round of 32": "Round of 32",
  "round of 16": "Round of 16",
  quarterfinals: "Quarterfinals",
  semifinals: "Semifinals",
  "knockout round playoffs": "Knockout Round Playoffs",
};

/** Group stages share the scoreboard; they must never enter the bracket. */
const NON_KNOCKOUT_SLUG = /group|regular|table|phase/i;

export interface BracketLeg {
  id: string;
  home: string;
  homeLogo: string;
  homeId: string;
  away: string;
  awayLogo: string;
  awayId: string;
  /** Regulation score only — shoot-out digits live in pensHome/pensAway. */
  homeScore: string;
  awayScore: string;
  /** Shoot-out digits, present only when the note names the winning side. */
  pensHome?: string;
  pensAway?: string;
  dateUtc: string;
  /** "completed" | "live" | "pending". */
  status: string;
  live: boolean;
  /** "Ida" | "Vuelta" | "" (single-match ties). */
  legLabel: string;
}

export interface BracketTie {
  status: "completed" | "pending";
  /** Localized tie note ("Empatados en el global - PAL Gana 5-3..."), may be "". */
  note: string;
  /** Winning team id, "" while pending. */
  winnerId: string;
  /** One or two events, sorted by date ascending. */
  legs: BracketLeg[];
}

export interface BracketRound {
  /** Spanish title ("Octavos de final"). */
  title: string;
  /** ESPN English key, or "final". */
  titleKey: string;
  /** True only when every tie of the round is decided. */
  completed: boolean;
  ties: BracketTie[];
}

export interface Bracket {
  competition: string;
  tournament: string;
  updated: string;
  rounds: BracketRound[];
}

import { espn } from "./espn";

/** yyyyMMdd for a Date; used for the window filter on ISO dates. */
function formatDay(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * The whole season in ONE request (see the header comment). `dates=<year>`
 * accepts a calendar year; the window start decides which year to ask for,
 * which is the same season these cups run on. The 1.6 MB payload is cached
 * for 30 minutes, and the window filter below keeps only relevant events.
 */
function windowEnd(now: Date): string {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  end.setDate(end.getDate() + PROBE_FUTURE_DAYS);
  return formatDay(end);
}

function seasonEvents(slug: string, year: string): Promise<any[]> {
  return espn(`${ESPN_SITE}/${slug}/scoreboard?dates=${year}&limit=500&lang=es`).then(
    (data) => (Array.isArray(data?.events) ? data.events : [])
  );
}

/** Keeps events inside [windowStart, today + lookahead]; string compare works on both ISO and yyyyMMdd. */
function inWindow(event: any, start: string, end: string): boolean {
  const date = String(event?.date ?? event?.competitions?.[0]?.date ?? "");
  const compact = `${String(date).slice(0, 10).replace(/-/g, "")}`;
  return compact >= start && compact <= end;
}

/** The season year these knockouts belong to (the window's own year). */
function windowYear(windowStart: string): string {
  return windowStart.slice(0, 4);
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** ESPN lists unplayed slots as "TBD Home"/"TBD Away" — never render those. */
function isPlaceholderTeam(team: any): boolean {
  const name = String(team?.displayName ?? team?.name ?? "");
  const abbr = String(team?.abbreviation ?? "");
  return /^tbd\b/i.test(name) || /^tbd$/i.test(abbr);
}

/**
 * Round key/title for one event.
 *
 * Priority: `series.title` (English stable key on the cups) -> `season.slug`
 * (English key, the only signal Copa Argentina has) -> `altGameNote` suffix
 * (localized). Returns null for anything that is not a knockout round.
 */
function resolveRound(event: any, comp: any): { key: string; title: string } | null {
  const seriesTitle = typeof comp.series?.title === "string" ? comp.series.title.trim() : "";
  if (seriesTitle) {
    return { key: seriesTitle, title: ROUND_TITLES[seriesTitle] ?? seriesTitle };
  }

  const seasonSlug = String(event.season?.slug ?? "").trim().toLowerCase();
  if (seasonSlug && !NON_KNOCKOUT_SLUG.test(seasonSlug)) {
    const bySlug = SEASON_SLUG_ROUNDS[seasonSlug];
    if (bySlug) return { key: bySlug, title: ROUND_TITLES[bySlug] ?? bySlug };
  } else if (seasonSlug) {
    return null;
  }

  // "Copa ARG, Ronda de 16" / "Libertadores, Final".
  const altNote = String(comp.altGameNote ?? "").trim();
  const suffix = altNote.slice(altNote.lastIndexOf(",") + 1).trim();
  if (!suffix) return null;

  const bySuffix = ROUND_SUFFIXES[normalizeText(suffix)];
  if (bySuffix) return { key: bySuffix, title: ROUND_TITLES[bySuffix] ?? bySuffix };

  // Unknown stage: keep ESPN's own wording instead of inventing one.
  return { key: suffix, title: suffix };
}

/** Strip the leg prefix ESPN repeats in the headline; a bare "Ida" says nothing. */
function cleanNote(headline: unknown): string {
  const text = String(headline ?? "").trim();
  if (!text) return "";
  if (/^(?:ida|vuelta|1st leg|2nd leg|juego de (?:ida|vuelta))$/i.test(text)) return "";
  return text
    .replace(/^(?:1st leg|2nd leg|juego de (?:ida|vuelta)|ida|vuelta)\s*[-–—:]\s*/i, "")
    .trim();
}

/**
 * Shoot-out digits from the tie note, attributed to the right side.
 *
 * ESPN localizes the note ("Juego de Vuelta - Empatados en el global - PAL
 * Gana 5-3 en tiros de penal", or "Platense Gana 3-1 en tiros de penal" with a
 * full club name), always naming the winner right before the digits. We only
 * fill pensHome/pensAway when a side can be identified; otherwise the note
 * text still carries the shoot-out and the UI can show it as-is.
 */
function parsePens(
  note: string,
  competitors: any[]
): { home?: string; away?: string } {
  if (!note || !/(penal|penalt|tiros\s+de\s+penal|\bpens\b)/i.test(note)) return {};

  const text = normalizeText(note);
  const sides = competitors.filter((c) => c && c.team);
  for (const side of sides) {
    const names = [
      side.team?.abbreviation,
      side.team?.shortDisplayName,
      side.team?.displayName,
      side.team?.name,
    ]
      .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 1)
      .map((name) => normalizeText(name))
      .sort((a, b) => b.length - a.length);

    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(?:^|[^a-z0-9])${escaped}[^0-9]{0,25}(\\d+)\\s*[-–—]\\s*(\\d+)[^0-9]{0,25}(?:penal|penalt|penales|pens)`,
        "i"
      );
      const match = re.exec(text);
      if (!match) continue;
      const winnerPens = match[1];
      const loserPens = match[2];
      return side.homeAway === "home"
        ? { home: winnerPens, away: loserPens }
        : { home: loserPens, away: winnerPens };
    }
  }
  return {};
}

function legLabelFor(comp: any, index: number, total: number): string {
  const display = String(comp.leg?.displayValue ?? "").trim().toLowerCase();
  if (display === "ida" || display === "1st leg") return "Ida";
  if (display === "vuelta" || display === "2nd leg") return "Vuelta";

  const value = Number(comp.leg?.value);
  if (total > 1 && (value === 1 || value === 2)) return value === 1 ? "Ida" : "Vuelta";
  // Positional fallback only when the series really has two matches.
  if (total === 2) return index === 0 ? "Ida" : "Vuelta";
  return "";
}

function toLeg(event: any, comp: any): BracketLeg {
  const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
  const home = competitors.find((c: any) => c?.homeAway === "home") ?? competitors[0] ?? {};
  const away = competitors.find((c: any) => c?.homeAway === "away") ?? competitors[1] ?? {};
  const state = String(comp.status?.type?.state ?? event.status?.type?.state ?? "");
  const played = state !== "pre";
  const pens = parsePens(String(comp.notes?.[0]?.headline ?? ""), competitors);

  return {
    id: String(event.id ?? comp.id ?? ""),
    home: String(home.team?.displayName ?? ""),
    homeLogo: String(home.team?.logo ?? home.team?.logos?.[0]?.href ?? ""),
    homeId: String(home.team?.id ?? home.id ?? ""),
    away: String(away.team?.displayName ?? ""),
    awayLogo: String(away.team?.logo ?? away.team?.logos?.[0]?.href ?? ""),
    awayId: String(away.team?.id ?? away.id ?? ""),
    // ESPN reports "0" for a match that has not kicked off; "" reads honestly.
    homeScore: played ? String(home.score ?? "") : "",
    awayScore: played ? String(away.score ?? "") : "",
    ...(pens.home !== undefined && pens.away !== undefined
      ? { pensHome: pens.home, pensAway: pens.away }
      : {}),
    dateUtc: String(event.date ?? comp.date ?? ""),
    status: state === "post" ? "completed" : state === "in" ? "live" : "pending",
    live: state === "in",
    legLabel: "",
  };
}

interface StagedLeg {
  event: any;
  comp: any;
  dateMs: number;
}

/**
 * A tie is decided when ESPN says the series is completed, or — without a
 * series — when the single match is `post`. A two-match series that only has
 * its first leg played stays pending even though that leg has a winner.
 */
function isTieCompleted(staged: StagedLeg[]): boolean {
  if (staged.some((leg) => leg.comp.series?.completed === true)) return true;

  const states = staged.map((leg) =>
    String(leg.comp.status?.type?.state ?? leg.event.status?.type?.state ?? "")
  );
  const lastState = states[states.length - 1] ?? "";
  const hasSeries = staged.some((leg) => !!leg.comp.series);
  if (!hasSeries) return lastState === "post";

  const total = Number(
    staged[staged.length - 1]?.comp?.series?.totalCompetitions ?? staged.length
  );
  return total <= 1 && lastState === "post";
}

/**
 * A series aggregate, or null when ESPN does not report one.
 *
 * `Number(null)` and `Number("")` are both 0, so the value is parsed by hand:
 * a missing aggregate must read as UNKNOWN, never as a 0-0 tie, or it could
 * decide a tie by accident.
 */
function seriesAggregate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The club that advanced from a tie.
 *
 * ESPN's `series.competitors[].winner` flag is NOT the tie winner: it mirrors
 * the LAST leg's winner. Verified on the 2026 Libertadores quarterfinal
 * between Fluminense and Platense — ESPN flagged Platense (who won the second
 * leg 2-1) while the series aggregate (3-2) and the match note both said
 * Fluminense advanced. Trusting the flag marked the eliminated club as the
 * qualifier.
 *
 * Rule: a decisive aggregate decides the tie; when the aggregate is tied the
 * tie went to penalties and the flag IS the shootout winner. A tie without a
 * series is a single match, where the event flag is the only signal.
 */
function tieWinnerId(staged: StagedLeg[]): string {
  // The decisive leg is the last one; walk backwards so a leg without data
  // never hides the one that carries it.
  for (let i = staged.length - 1; i >= 0; i--) {
    const { comp } = staged[i];
    const seriesComps = comp.series?.competitors ?? [];

    if (seriesComps.length >= 2) {
      const totals = seriesComps.map((c: any) => ({
        id: String(c.id ?? ""),
        aggregate: seriesAggregate(c.aggregateScore),
      }));
      const [a, b] = totals;
      if (a.aggregate !== null && b.aggregate !== null && a.aggregate !== b.aggregate) {
        return a.aggregate > b.aggregate ? a.id : b.id;
      }
      // Tied (or unknown) aggregate: penalties decided it, and the flag names
      // the qualifier. Without a flag the tie stays undecided.
      const flagged = seriesComps.find((c: any) => c?.winner);
      if (flagged) return String(flagged.id ?? "");
      return "";
    }

    // Single-match tie (no series): the event winner is the qualifier.
    const eventWinner = (comp.competitors ?? []).find((c: any) => c?.winner);
    if (eventWinner) return String(eventWinner.team?.id ?? eventWinner.id ?? "");
  }
  return "";
}

function tieNote(staged: StagedLeg[]): string {
  for (let i = staged.length - 1; i >= 0; i--) {
    const note = cleanNote(staged[i].comp.notes?.[0]?.headline);
    if (note) return note;
  }
  return "";
}

function roundRank(key: string): number {
  const index = ROUND_ORDER.indexOf(key);
  return index === -1 ? ROUND_ORDER.length : index;
}

/**
 * Pure mapper: raw ESPN scoreboard events -> the bracket JSON shape.
 * Exported so the mapping can be verified without hitting the network.
 */
export function mapBracketEvents(competition: CompetitionKey, events: any[]): Bracket {
  const config = COMPETITIONS[competition];
  const seen = new Set<string>();
  /** round key -> tie key -> legs (one or two events). */
  const groups = new Map<string, Map<string, { title: string; legs: StagedLeg[] }>>();

  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== "object") continue;
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const eventId = String(event.id ?? "");
    if (!eventId || seen.has(eventId)) continue;
    seen.add(eventId);

    const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
    if (competitors.some((c: any) => isPlaceholderTeam(c?.team))) continue;

    const round = resolveRound(event, comp);
    if (!round) continue;

    const teamIds = competitors
      .map((c: any) => String(c?.team?.id ?? c?.id ?? ""))
      .filter(Boolean)
      .sort();
    if (teamIds.length < 2) continue;

    const byTie: Map<string, { title: string; legs: StagedLeg[] }> =
      groups.get(round.key) ?? new Map<string, { title: string; legs: StagedLeg[] }>();
    const tieKey = teamIds.join("-");
    const group: { title: string; legs: StagedLeg[] } = byTie.get(tieKey) ?? {
      title: round.title,
      legs: [],
    };
    group.legs.push({
      event,
      comp,
      dateMs: Date.parse(String(event.date ?? comp.date ?? "")) || 0,
    });
    byTie.set(tieKey, group);
    groups.set(round.key, byTie);
  }

  const rounds: Array<{ key: string; title: string; firstDate: number; ties: BracketTie[] }> = [];

  for (const [roundKey, byTie] of groups) {
    const ties: Array<{ tie: BracketTie; firstDate: number }> = [];
    let roundTitle = roundKey;

    for (const group of byTie.values()) {
      roundTitle = group.title;
      const staged = group.legs.sort((a, b) => a.dateMs - b.dateMs);
      const completed = isTieCompleted(staged);
      const legs = staged.map((leg, index) => {
        const mapped = toLeg(leg.event, leg.comp);
        mapped.legLabel = legLabelFor(leg.comp, index, staged.length);
        return mapped;
      });

      ties.push({
        firstDate: staged[0]?.dateMs ?? 0,
        tie: {
          status: completed ? "completed" : "pending",
          note: tieNote(staged),
          winnerId: completed ? tieWinnerId(staged) : "",
          legs,
        },
      });
    }

    ties.sort((a, b) => a.firstDate - b.firstDate);
    rounds.push({
      key: roundKey,
      title: roundTitle,
      firstDate: ties[0]?.firstDate ?? 0,
      ties: ties.map((entry) => entry.tie),
    });
  }

  rounds.sort((a, b) => roundRank(a.key) - roundRank(b.key) || a.firstDate - b.firstDate);

  return {
    competition,
    tournament: config.name,
    updated: new Date().toISOString(),
    rounds: rounds.map((round) => ({
      title: round.title,
      titleKey: round.key,
      completed: round.ties.length > 0 && round.ties.every((tie) => tie.status === "completed"),
      ties: round.ties,
    })),
  };
}

/**
 * Full bracket for one competition: ONE season request + mapping.
 *
 * Throws only when ESPN failed to serve the season — that is the difference
 * between "ESPN is down" (502) and "no round has been played yet" (an empty
 * `rounds`, which is valid data and gets cached).
 */
export async function buildBracket(competition: CompetitionKey, now = new Date()): Promise<Bracket> {
  const config = COMPETITIONS[competition];
  const year = windowYear(config.windowStart);
  if (year.length !== 4) throw new Error("ventana de fechas inválida");

  const allEvents = await seasonEvents(config.slug, year);
  const end = windowEnd(now);
  const events = allEvents.filter((event: any) => inWindow(event, config.windowStart, end));

  return mapBracketEvents(competition, events);
}
