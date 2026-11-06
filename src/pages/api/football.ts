// Server-side proxy for API-Football. Keeps the API key out of the browser.
// Legacy reference: legacy/js/api.js (league ids preserved)
//
// GET /api/football?competition=lpf|libertadores|sudamericana&view=standings|last|next|live

export const prerender = false;

const COMPETITIONS = {
  lpf: { league: 1032, name: "Liga Profesional Argentina" },
  libertadores: { league: 13, name: "Copa Libertadores" },
  sudamericana: { league: 11, name: "Copa Sudamericana" },
} as const;

const API_URL = "https://v3.football.api-sports.io";

/** Season follows the current year; no more hardcoded 2024. */
function currentSeason(): string {
  const now = new Date();
  // handle UTC/ARG utc-offset by using local date
  return String(now.getFullYear());
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; at: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function apiKey(): string | null {
  return import.meta.env.API_FOOTBALL_KEY ?? null;
}

async function callApi(path: string): Promise<any> {
  const key = apiKey();
  if (!key) throw new Error("API_FOOTBALL_KEY no configurada");

  const res = await fetch(`${API_URL}/${path}`, {
    headers: { "x-apisports-key": key },
  });
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`);

  const payload = await res.json();
  if (payload.errors && Object.keys(payload.errors).length > 0) {
    throw new Error(JSON.stringify(payload.errors));
  }
  return payload;
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

function mapFixture(f: any) {
  const referee = f.fixture?.referee ?? "Sin información";
  return {
    round: f.league?.round ?? "",
    status: f.fixture?.status?.long ?? "",
    dateUtc: f.fixture?.date ?? "",
    home: f.teams?.home?.name ?? "",
    homeLogo: f.teams?.home?.logo ?? "",
    away: f.teams?.away?.name ?? "",
    awayLogo: f.teams?.away?.logo ?? "",
    homeGoals: f.goals?.home ?? 0,
    awayGoals: f.goals?.away ?? 0,
    venue: `${f.fixture?.venue?.name ?? ""} — ${f.fixture?.venue?.city ?? ""}`.replace(/^ — /, ""),
  };
}

export const GET: APIRoute = async ({ params, url }) => {
  const competition = url.searchParams.get("competition") ?? "";
  const view = url.searchParams.get("view") ?? "";

  const meta = COMPETITIONS[competition as keyof typeof COMPETITIONS];
  if (!meta) {
    return json({ error: "competencia inválida" }, 400);
  }
  if (!["standings", "last", "next", "live"].includes(view)) {
    return json({ error: "vista inválida" }, 400);
  }

  try {
    if (view === "standings") {
      const data = await withCache(`${meta.league}:standings`, async () => {
        const payload = await callApi(
          `standings?league=${meta.league}&season=${currentSeason()}`
        );
        const groups = payload.response?.[0]?.league?.standings ?? [];
        const groupNames = ["Grupo A", "Grupo B", "Grupo C", "Grupo D", "Fase Final"];
        return {
          groups: groups.map((rows: any[], i: number) => ({
            groupName: groupNames[i] ?? `Tabla ${i + 1}`,
            rows: rows.map((r) => ({
              rank: r.rank,
              team: r.team?.name ?? "",
              logo: r.team?.logo ?? "",
              played: r.all?.played ?? 0,
              win: r.all?.win ?? 0,
              draw: r.all?.draw ?? 0,
              lose: r.all?.lose ?? 0,
              goalsFor: r.all?.goals?.for ?? 0,
              goalsAgainst: r.all?.goals?.against ?? 0,
              diff: r.goalsDiff ?? 0,
              points: r.points ?? 0,
            })),
          })),
        };
      });
      return json(data);
    }

    if (view === "last" || view === "next") {
      const suffix = view === "last" ? "last=15" : "next=14";
      const data = await withCache(`${meta.league}:${view}`, async () => {
        const payload = await callApi(
          `fixtures?league=${meta.league}&season=${currentSeason()}&${suffix}&timezone=America/Argentina/Buenos_Aires`
        );
        const fixtures = (payload.response ?? []).filter(
          (f: any) => view !== "last" || f.fixture?.status?.long === "Match Finished"
        );
        return { fixtures: fixtures.map(mapFixture) };
      });
      return json(data);
    }

    // live
    const data = await withCache(`${meta.league}:live`, async () => {
      const payload = await callApi(
        `fixtures?live=${meta.league}&timezone=America/Argentina/Buenos_Aires`
      );
      const fixtures = (payload.response ?? []).map((f: any) => ({
        ...mapFixture(f),
        league: f.league?.name ?? "",
        elapsed: f.fixture?.status?.elapsed ?? "",
      }));
      return { fixtures };
    });
    return json(data);
  } catch (err: any) {
    console.error("[api/football]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
