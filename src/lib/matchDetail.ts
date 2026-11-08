// Match detail for /match/[id]: one ESPN summary feed per event, mapped to
// what the page shows. Server-side only — the browser never talks to ESPN,
// same zero-key rule as /api/live and /api/football.
//
// The mapping serves both the SSR page and /api/match (the 60s live poll),
// and the HTML builders live here too: the client poll swaps a section's
// innerHTML with the very same markup the server rendered, so the templates
// exist once, not twice.

const ESPN_SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=";

/** A live poll every minute must not turn into a request per visitor. */
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { data: MatchDetail; at: number }>();

export interface MatchSide {
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  record: string;
}

export interface MatchEvent {
  /** Seconds since kickoff, used only for sorting. */
  at: number;
  clock: string;
  kind: "goal" | "yellow" | "red";
  team: string;
  players: string[];
  note: string;
}

export interface MatchStat {
  name: string;
  label: string;
  home: string;
  away: string;
  /** 0..1, the home share drawn as the stat bar. */
  homeShare: number;
}

export interface MatchHalf {
  label: string;
  home: string;
  away: string;
}

export interface MatchLineup {
  team: string;
  players: Array<{ number: string; name: string; position: string }>;
}

export interface MatchDetail {
  id: string;
  league: string;
  season: string;
  dateUtc: string;
  venue: string;
  status: { state: "pre" | "in" | "post"; label: string; live: boolean };
  home: MatchSide;
  away: MatchSide;
  halves: MatchHalf[];
  events: MatchEvent[];
  stats: MatchStat[];
  lineups: MatchLineup[];
  updatedAt: string;
}

/** ESPN event ids are numeric; anything else never reaches a fetch. */
export function isValidEventId(id: string): boolean {
  return /^\d{5,12}$/.test(id);
}

export async function fetchMatchDetail(id: string): Promise<MatchDetail | null> {
  if (!isValidEventId(id)) return null;

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const res = await fetch(ESPN_SUMMARY + encodeURIComponent(id), {
    headers: { "user-agent": "MiXteam/2.0 (+portfolio project)" },
  });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);

  const detail = mapSummary(id, await res.json());
  if (!detail) return null;

  cache.set(id, { data: detail, at: Date.now() });
  return detail;
}

function mapSummary(id: string, payload: any): MatchDetail | null {
  const header = payload?.header;
  const comp = header?.competitions?.[0];
  if (!comp) return null;

  const competitors: any[] = comp.competitors ?? [];
  const homeC = competitors.find((c) => c?.homeAway === "home");
  const awayC = competitors.find((c) => c?.homeAway === "away");
  if (!homeC || !awayC) return null;

  const rawState = String(comp.status?.type?.state ?? "pre");
  const state = rawState === "in" || rawState === "post" ? rawState : "pre";

  return {
    id,
    league: String(header.league?.shortName || header.league?.name || ""),
    season: String(header.season?.name ?? ""),
    dateUtc: String(comp.date ?? ""),
    venue: venueText(payload?.gameInfo?.venue),
    status: statusOf(state, comp.status),
    home: sideOf(homeC, state),
    away: sideOf(awayC, state),
    halves: state === "pre" ? [] : halvesOf(homeC, awayC),
    events: eventsOf(comp, payload?.keyEvents),
    stats: statsOf(payload?.boxscore),
    lineups: lineupsOf(payload?.rosters),
    updatedAt: new Date().toISOString(),
  };
}

function statusOf(state: string, status: any): MatchDetail["status"] {
  if (state === "pre") return { state: "pre", label: "Por jugar", live: false };

  const type = status?.type ?? {};
  if (state === "post") {
    const detail = String(type.detail ?? "");
    let label = "Finalizado";
    if (/penalt/i.test(detail)) label = "Penales";
    else if (/extra/i.test(detail)) label = "Prórroga";
    return { state: "post", label, live: false };
  }

  // The halftime keeps the last minute of the first half in displayClock,
  // so the status name has to win over the clock (same rule as the ticker).
  if (String(type.name ?? "").includes("HALFTIME")) {
    return { state: "in", label: "Descanso", live: true };
  }

  const clock = clockText(String(status?.displayClock ?? ""));
  const label = [clock || "En vivo", periodText(status?.displayPeriod)]
    .filter(Boolean)
    .join(" · ");
  return { state: "in", label, live: true };
}

/** ESPN formats the clock as `59'` or `45'+3'`. */
function clockText(raw: string): string {
  const match = /^(\d{1,3})'(?:\+(\d{1,2}))?'?$/.exec(raw.trim());
  if (!match) return raw.trim();
  return match[2] ? `${match[1]}+${match[2]}'` : `${match[1]}'`;
}

function periodText(displayPeriod: unknown): string {
  const value = String(displayPeriod ?? "");
  if (value === "1st") return "1T";
  if (value === "2nd") return "2T";
  return value;
}

function sideOf(competitor: any, state: string): MatchSide {
  const team = competitor?.team ?? {};
  const logos = Array.isArray(team.logos) ? team.logos : [];
  const records = Array.isArray(competitor?.record) ? competitor.record : [];
  const total = records.find((r: any) => String(r?.type ?? "") === "total");

  const rawScore = String(competitor?.score ?? "").trim();
  // Before kickoff there is no score to show (the page renders `vs`).
  const score =
    state === "pre" ? rawScore : rawScore === "" ? "0" : rawScore;

  return {
    name: String(team.displayName || team.name || ""),
    abbreviation: String(team.abbreviation || team.shortDisplayName || ""),
    logo: String(logos[0]?.href ?? ""),
    score,
    record: String(total?.displayValue || total?.summary || ""),
  };
}

function venueText(venue: any): string {
  if (!venue) return "";
  const parts = [venue.fullName, venue.address?.city].filter(Boolean);
  return parts.join(" — ");
}

function halvesOf(homeC: any, awayC: any): MatchHalf[] {
  const homeLines = Array.isArray(homeC?.linescores) ? homeC.linescores : [];
  const awayLines = Array.isArray(awayC?.linescores) ? awayC.linescores : [];
  return homeLines
    .map((line: any, index: number) => ({
      label: `${index + 1}T`,
      home: String(line?.displayValue ?? line?.value ?? ""),
      away: String(awayLines[index]?.displayValue ?? awayLines[index]?.value ?? ""),
    }))
    .filter((half: MatchHalf) => half.home !== "" || half.away !== "");
}

function participantsOf(list: any): string[] {
  return (Array.isArray(list) ? list : [])
    .map((p: any) => String(p?.athlete?.displayName ?? ""))
    .filter(Boolean);
}

function eventRank(event: MatchEvent): number {
  if (event.kind === "goal") return 0;
  return event.kind === "yellow" ? 1 : 2;
}

function eventsOf(comp: any, keyEvents: any): MatchEvent[] {
  const out: MatchEvent[] = [];

  // Goals live in the competition details; cards are not there, they are
  // in the key events feed with an English "Yellow Card" type text.
  const details = Array.isArray(comp?.details) ? comp.details : [];
  for (const detail of details) {
    if (!detail?.scoringPlay) continue;
    out.push({
      at: Number(detail?.clock?.value ?? 0),
      clock: String(detail?.clock?.displayValue ?? ""),
      kind: "goal",
      team: String(detail?.team?.abbreviation || detail?.team?.displayName || ""),
      players: participantsOf(detail?.participants),
      note: [detail?.ownGoal ? "en contra" : "", detail?.penaltyKick ? "pen." : ""]
        .filter(Boolean)
        .join(", "),
    });
  }

  const keys = Array.isArray(keyEvents) ? keyEvents : [];
  for (const event of keys) {
    const text = String(event?.type?.text ?? "");
    if (!/card/i.test(text)) continue;
    const players = participantsOf(event?.participants);
    if (players.length === 0) continue;
    out.push({
      at: Number(event?.clock?.value ?? 0),
      clock: String(event?.clock?.displayValue ?? ""),
      kind: /red/i.test(text) ? "red" : "yellow",
      team: String(event?.team?.abbreviation || event?.team?.displayName || ""),
      players,
      note: "",
    });
  }

  out.sort((a, b) => a.at - b.at || eventRank(a) - eventRank(b));
  return out;
}

/** The stats this audience reads, in football order, in Spanish. */
const STAT_ORDER: Array<{ name: string; label: string }> = [
  { name: "possessionPct", label: "Posesión" },
  { name: "totalShots", label: "Tiros" },
  { name: "shotsOnTarget", label: "Tiros al arco" },
  { name: "wonCorners", label: "Córners" },
  { name: "foulsCommitted", label: "Faltas" },
  { name: "yellowCards", label: "Amarillas" },
  { name: "redCards", label: "Rojas" },
  { name: "offsides", label: "Offsides" },
  { name: "saves", label: "Atajadas" },
  { name: "totalPasses", label: "Pases" },
];

function statsOf(boxscore: any): MatchStat[] {
  const teams: any[] = Array.isArray(boxscore?.teams) ? boxscore.teams : [];
  const homeT = teams.find((t) => t?.homeAway === "home") ?? teams[0];
  const awayT = teams.find((t) => t?.homeAway === "away") ?? teams[1];
  if (!homeT || !awayT) return [];

  const toMap = (list: any) =>
    new Map<string, string>(
      (Array.isArray(list) ? list : []).map((s: any) => [
        String(s?.name),
        String(s?.displayValue ?? ""),
      ])
    );
  const homeStats = toMap(homeT.statistics);
  const awayStats = toMap(awayT.statistics);

  const out: MatchStat[] = [];
  for (const { name, label } of STAT_ORDER) {
    const home = homeStats.get(name) ?? "";
    const away = awayStats.get(name) ?? "";
    if (home === "" && away === "") continue;

    // Percentage stats arrive either already scaled (possessionPct 31.3)
    // or as a ratio (passPct 0.7): normalize both to a display value.
    const isPct = name.endsWith("Pct");
    out.push({
      name,
      label,
      home: isPct ? pctText(home) : home,
      away: isPct ? pctText(away) : away,
      homeShare: homeShare(name, home, away, isPct),
    });
  }
  return out;
}

function pctText(raw: string): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw;
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function homeShare(name: string, home: string, away: string, isPct: boolean): number {
  const h = Number(home);
  const a = Number(away);
  if (isPct) {
    if (!Number.isFinite(h)) return 0.5;
    return Math.min(1, Math.max(0, h <= 1 ? h : h / 100));
  }
  if (!Number.isFinite(h) || !Number.isFinite(a) || h + a === 0) return 0.5;
  return h / (h + a);
}

function lineupsOf(rosters: any): MatchLineup[] {
  const teams: any[] = Array.isArray(rosters?.teams) ? rosters.teams : [];
  return teams
    .map((entry) => ({
      team: String(entry?.team?.displayName ?? ""),
      players: (Array.isArray(entry?.roster) ? entry.roster : [])
        .map((player: any) => ({
          number: String(player?.athlete?.jersey ?? ""),
          name: String(
            player?.athlete?.displayName ?? player?.athlete?.shortDisplayName ?? ""
          ),
          position: String(
            player?.position?.abbreviation ?? player?.athlete?.position?.abbreviation ?? ""
          ),
        }))
        .filter((player: { name: string }) => player.name !== ""),
    }))
    .filter((lineup: MatchLineup) => lineup.players.length > 0);
}

function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!
  );
}

/** Which side of the timeline an event belongs to: home is the fallback. */
function eventSide(detail: MatchDetail, team: string): "home" | "away" {
  const needle = team.trim().toLowerCase();
  if (needle === "") return "home";

  const matches = (side: MatchSide) =>
    [side.abbreviation, side.name].some(
      (value) => value.trim().toLowerCase() === needle
    );

  if (matches(detail.home)) return "home";
  if (matches(detail.away)) return "away";
  return "home";
}

/** Text-node token such as `45+3'`: the minute mark stays literal. */
function clockHtml(raw: string): string {
  // esc() turns the apostrophe into &#39;; inside text it is not required.
  return esc(raw).replace(/&#39;/g, "'");
}

/**
 * Secondary line of an event: the assist for goals, plus any note the feed
 * attached ("en contra", "pen."). Empty when there is nothing to say.
 */
function eventSub(event: MatchEvent, assists: string[]): string {
  const parts: string[] = [];
  if (event.kind === "goal" && assists.length > 0) {
    parts.push(`asistencia de ${assists.join(", ")}`);
  }
  if (event.note) {
    parts.push(
      ...event.note
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    );
  }
  return parts.join(" · ");
}

/** Summary of goals and cards: the section a match page is judged on. */
export function eventsHtml(detail: MatchDetail): string {
  if (detail.events.length === 0) {
    return `<p class="mx__empty">${
      detail.status.state === "pre" ? "Todavía no arrancó." : "Sin goles ni tarjetas."
    }</p>`;
  }

  const icons: Record<MatchEvent["kind"], string> = {
    goal: "⚽",
    yellow: "🟨",
    red: "🟥",
  };

  const items = detail.events
    .map((event) => {
      const [player, ...assists] = event.players;
      const side = eventSide(detail, event.team);
      const sub = eventSub(event, assists);
      return `
        <li class="mx__event" data-side="${side}" data-kind="${event.kind}">
          <span class="mx__event-clock">${clockHtml(event.clock)}</span>
          <span class="mx__event-icon" aria-hidden="true">${icons[event.kind]}</span>
          <span class="mx__event-player">${esc(player || event.team)}</span>${
            sub ? `\n          <span class="mx__event-sub">${esc(sub)}</span>` : ""
          }
        </li>`;
    })
    .join("");

  return `<ol class="mx__events">${items}</ol>`;
}

/** Paired home/away stats, each row a two-sided bar. */
export function statsHtml(detail: MatchDetail): string {
  if (detail.stats.length === 0) {
    return `<p class="mx__empty">Las estadísticas aparecen cuando arranca el partido.</p>`;
  }

  const home = esc(detail.home.abbreviation || detail.home.name);
  const away = esc(detail.away.abbreviation || detail.away.name);
  const rows = detail.stats
    .map((stat) => {
      // Round the home share once, then derive the away share from it, so the
      // two widths can never add up to more (or less) than 100%.
      const homePct = Math.min(100, Math.max(0, Math.round(stat.homeShare * 100)));
      const awayPct = 100 - homePct;
      return `
      <div class="mx__stat">
        <span class="mx__stat-value mx__stat-value--home">${esc(stat.home)}</span>
        <span class="mx__stat-info">
          <span class="mx__stat-label">${esc(stat.label)}</span>
          <span class="mx__stat-bar" aria-hidden="true"><span class="mx__stat-bar-home" style="width:${homePct}%"></span><span class="mx__stat-bar-away" style="width:${awayPct}%"></span></span>
        </span>
        <span class="mx__stat-value mx__stat-value--away">${esc(stat.away)}</span>
      </div>`;
    })
    .join("");

  return `
    <div class="mx__stats">
      <div class="mx__stat-head">
        <span class="mx__stat-head-home">${home}</span>
        <span class="mx__stat-head-away">${away}</span>
      </div>
      ${rows}
    </div>`;
}

/** Per-period score chips: `1T 1–1`. Empty before kickoff. */
export function halvesHtml(detail: MatchDetail): string {
  return detail.halves
    .map(
      (half) =>
        `<span class="mx__half">${esc(half.label)} ${esc(half.home)}–${esc(
          half.away
        )}</span>`
    )
    .join("");
}
