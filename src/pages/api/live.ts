// Server-side proxy for the live matches ticker, fed by ESPN's public API.
// Same zero-key approach as /api/football, but for every league at once.
//
// The `soccer/all/scoreboard` feed does not carry the competition name, and
// its event links only name the league on some of the events. The numeric
// league id, however, is always in the event uid (`s:600~l:770~e:761934`),
// and every competition has a stable id. Mapping those ids to a name keeps
// the ticker to a single upstream request.
//
// GET /api/live

export const prerender = false;

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=500";

/** A live score changes every minute: poll fast, but not on every request. */
const CACHE_TTL_MS = 60 * 1000;

const cache = new Map<string, { data: unknown; at: number }>();

/**
 * The competitions the ticker shows, with the ESPN league id and the name
 * to display.
 *
 * The all-leagues feed carries every game on Earth, and most of them are
 * college soccer or third-tier leagues nobody here follows. The ticker is
 * for the competitions this audience actually watches.
 */
const TICKER_LEAGUES: Record<string, { name: string; featured?: boolean }> = {
  // The competitions of this site.
  "745": { name: "Liga Profesional", featured: true },
  "783": { name: "Copa Libertadores", featured: true },
  "5454": { name: "Copa Sudamericana", featured: true },
  // Europe.
  "775": { name: "Champions League" },
  "776": { name: "Europa League" },
  "20296": { name: "Conference League" },
  "700": { name: "Premier League" },
  "740": { name: "LaLiga" },
  "730": { name: "Serie A" },
  "720": { name: "Bundesliga" },
  "710": { name: "Ligue 1" },
  "725": { name: "Eredivisie" },
  "715": { name: "Liga Portugal" },
  // America.
  "770": { name: "MLS" },
  "760": { name: "Liga MX" },
  "630": { name: "Brasileirão" },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function espn(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "user-agent": "MiXteam/2.0 (+portfolio project)" },
  });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);
  return res.json();
}

function withCache(
  key: string,
  ttl: number,
  producer: () => Promise<unknown>
): Promise<unknown> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < ttl) {
    return Promise.resolve(cached.data);
  }
  return producer().then((data) => {
    cache.set(key, { data, at: Date.now() });
    return data;
  });
}

interface Competitor {
  team?: { displayName?: string; shortDisplayName?: string };
  score?: string;
  homeAway?: string;
}

/** The numeric league id lives in the event uid: `s:600~l:770~e:761934`. */
function leagueIdOf(event: any): string {
  const match = /~l:(\d+)~/.exec(String(event?.uid ?? ""));
  return match ? match[1] : "";
}

function shortName(competitor: Competitor | undefined): string {
  const team = competitor?.team ?? {};
  return String(team.shortDisplayName || team.displayName || "");
}

/**
 * The minute of the match.
 *
 * ESPN formats it as `39'`, `45'` or `45'+3'`, and the halftime keeps the
 * last minute of the first half, so the halftime wins over the clock.
 */
function clockOf(event: any): string {
  const type = event?.status?.type ?? {};
  if (String(type.name ?? "").includes("HALFTIME")) return "HT";

  const raw = String(event?.status?.displayClock ?? "").trim();
  const match = /^(\d{1,3})'(?:\+(\d{1,2}))?'?$/.exec(raw);
  if (!match) return "";
  return match[2] ? `${match[1]}+${match[2]}'` : `${match[1]}'`;
}

/**
 * The link to the match page.
 *
 * ESPN names it `summary` on finished games and `live` on the ones being
 * played, and both point at the gamecast.
 */
function summaryLink(event: any): string {
  const links: any[] = event?.links ?? [];
  for (const rel of ["summary", "live"]) {
    for (const link of links) {
      if (String(link?.rel ?? "").startsWith(rel)) return String(link.href ?? "");
    }
  }
  return "";
}

function mapEvent(event: any, league: { name: string; featured?: boolean }) {
  const comp = event.competitions?.[0] ?? {};
  const competitors: Competitor[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");

  return {
    id: String(event.id ?? ""),
    league: league.name,
    featured: league.featured === true,
    clock: clockOf(event),
    home: shortName(home),
    away: shortName(away),
    homeGoals: String(home?.score ?? ""),
    awayGoals: String(away?.score ?? ""),
    url: summaryLink(event),
    dateUtc: String(event.date ?? ""),
  };
}

export const GET: APIRoute = async () => {
  try {
    const events: any[] = (
      (await withCache("live", CACHE_TTL_MS, () => espn(ESPN_SCOREBOARD))) as any
    )?.events ?? [];

    const matches = events
      .filter((event) => event?.status?.type?.state === "in")
      .map((event) => {
        const league = TICKER_LEAGUES[leagueIdOf(event)];
        return league ? mapEvent(event, league) : null;
      })
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .filter((match) => match.home !== "" && match.away !== "");

    // The competitions of this site lead the ticker, the rest follow by kickoff.
    matches.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime();
    });

    return json({ matches, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error("[api/live]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
