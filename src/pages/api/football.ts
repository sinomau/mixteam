// Server-side proxy for football data, fed by ESPN's public API.
// Zero API keys, no plans, no quotas — current-season data included.
//
// Why ESPN and not API-Football: the free API-Football plan only serves
// seasons 2022-2024 and blocks the `next`/`last` parameters, so a current
// season (e.g. Liga Profesional 2026) is impossible without paying.
// ESPN's public endpoints cover all three competitions of this site.
//
// GET /api/football?competition=lpf|libertadores|sudamericana&view=standings|last|next|live

export const prerender = false;

const COMPETITIONS = {
  lpf: { slug: "arg.1", name: "Liga Profesional de Fútbol" },
  libertadores: { slug: "conmebol.libertadores", name: "Copa Libertadores" },
  sudamericana: { slug: "conmebol.sudamericana", name: "Copa Sudamericana" },
} as const;

const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";

const CACHE_TTL_MS = 5 * 60 * 1000;
const PAST_DAYS = 7;
const FUTURE_DAYS = 14;
const cache = new Map<string, { data: unknown; at: number }>();

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

function withCache(key: string, producer: () => Promise<unknown>): Promise<unknown> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }
  return producer().then((data) => {
    cache.set(key, { data, at: Date.now() });
    return data;
  });
}

/** YYYYMMDD in local (server) time, offset by `delta` days. */
function yyyymmdd(deltaDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function statValue(stats: Array<{ name: string; value: number }>, name: string): number {
  return stats.find((s) => s.name === name)?.value ?? 0;
}

interface Competitor {
  team: { displayName?: string; logo?: string };
  score?: string;
  homeAway?: string;
}

function mapEvent(event: any, leagueName: string) {
  const comp = event.competitions?.[0] ?? {};
  const home = (comp.competitors ?? []).find((c: Competitor) => c.homeAway === "home");
  const away = (comp.competitors ?? []).find((c: Competitor) => c.homeAway === "away");
  const status = event.status?.type ?? {};

  return {
    round: comp.notes?.[0]?.headline ?? leagueName,
    league: leagueName,
    // displayClock arrives as '78''-style (minutes already formatted).
    elapsed: (() => {
      const m = /(\d+)/.exec(event.status?.displayClock ?? "");
      return m ? `${m[1]}'` : "";
    })(),
    status: {
      pre: "Por jugar",
      in: "En vivo",
      post: "Finalizado",
    }[status.state] ?? status.detail ?? "",
    state: status.state ?? "",
    dateUtc: event.date ?? "",
    home: home?.team?.displayName ?? "",
    homeLogo: home?.team?.logo ?? "",
    away: away?.team?.displayName ?? "",
    awayLogo: away?.team?.logo ?? "",
    homeGoals: home?.score ?? "",
    awayGoals: away?.score ?? "",
    venue: comp.venue?.fullName ?? "",
  };
}

async function scoreboard(
  slug: string,
  date: string,
  leagueName: string
): Promise<Array<Record<string, unknown>>> {
  const data = await espn(`${ESPN_SITE}/${slug}/scoreboard?dates=${date}`);
  const name = leagueName || (data.leagues?.[0]?.name ?? "");
  return (data.events ?? []).map((event: any) => mapEvent(event, name));
}

/** Sort a standings table by football convention: points, goal diff, goals for. */
function rankRows(rows: Array<Record<string, number | string>>) {
  return rows
    .sort(
      (a, b) =>
        Number(b.points) - Number(a.points) ||
        Number(b.diff) - Number(a.diff) ||
        Number(b.goalsFor) - Number(a.goalsFor)
    )
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export const GET: APIRoute = async ({ url }) => {
  const competition = url.searchParams.get("competition") ?? "";
  const view = url.searchParams.get("view") ?? "";

  const meta = COMPETITIONS[competition as keyof typeof COMPETITIONS];
  if (!meta) return json({ error: "competencia inválida" }, 400);
  const { slug, name: competitionName } = meta;
  if (!["standings", "last", "next", "live"].includes(view)) {
    return json({ error: "vista inválida" }, 400);
  }

  try {
    if (view === "standings") {
      const data = await withCache(`${slug}:standings`, async () => {
        const data = await espn(`${ESPN_V2}/${slug}/standings`);
        const groups = (data.children ?? [])
          .map((child: any) => ({
            groupName: (child.name ?? "Tabla")
              .replace(/^Group\s+([A-Z0-9]+)$/i, "Grupo $1")
              .replace(/^Overall$/i, "General"),
            rows: rankRows(
              (child.standings?.entries ?? []).map((entry: any) => {
                const stats = entry.stats ?? [];
                const gf = statValue(stats, "pointsFor");
                const ga = statValue(stats, "pointsAgainst");
                return {
                  team: entry.team?.displayName ?? "",
                  logo: entry.team?.logo ?? "",
                  played: statValue(stats, "gamesPlayed"),
                  win: statValue(stats, "wins"),
                  draw: statValue(stats, "ties"),
                  lose: statValue(stats, "losses"),
                  goalsFor: gf,
                  goalsAgainst: ga,
                  diff: gf - ga,
                  points: statValue(stats, "points"),
                };
              })
            ),
          }))
          .filter((g: { rows: unknown[] }) => g.rows.length > 0);
        return { groups };
      });
      return json(data);
    }

    if (view === "last" || view === "next") {
      const data = await withCache(`${slug}:${view}`, async () => {
        const wanted = view === "last" ? "post" : "pre";
        const offsets =
          view === "last"
            ? Array.from({ length: PAST_DAYS }, (_, i) => -(i + 1))
            : Array.from({ length: FUTURE_DAYS + 1 }, (_, i) => i);

        const days = await Promise.all(
          offsets.map((offset) => scoreboard(slug, yyyymmdd(offset), competitionName))
        );
        const fixtures = days
          .flat()
          .filter((f: any) => f.state === wanted)
          .sort((a: any, b: any) => new Date(a.dateUtc) - new Date(b.dateUtc));
        return { fixtures };
      });
      return json(data);
    }

    // live — default scoreboard contains the matches of the day, with state included.
    const data = await withCache(`${slug}:live`, async () => {
      const fixtures = await scoreboard(slug, yyyymmdd(0), competitionName);
      return {
        fixtures: fixtures.filter((f: any) => f.state === "in"),
      };
    });
    return json(data);
  } catch (err: any) {
    console.error("[api/football]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
