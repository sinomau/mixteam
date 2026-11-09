// Knockout bracket endpoint for the cup pages.
//
// GET /api/bracket?competition=libertadores|sudamericana|copa-argentina
//
// Thin wrapper around src/lib/bracket: validation, a 30-minute server cache
// and the same json()/error conventions as /api/football. The lib does the
// ESPN day probes; a bracket moves at most once per matchday, so caching 30
// minutes is what keeps ~150 probes per competition from running per visit.
//
// Cache policy: only successful builds are stored. An ESPN failure returns
// the 502 and leaves the cache untouched, so the next visitor retries instead
// of being served a stale error body.

import type { APIRoute } from "astro";
import { buildBracket, isCompetitionKey } from "../../lib/bracket";

export const prerender = false;

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: unknown; at: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const competition = url.searchParams.get("competition") ?? "";
  if (!isCompetitionKey(competition)) {
    return json({ error: "competencia inválida" }, 400);
  }

  const cached = cache.get(competition);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.data);
  }

  try {
    const data = await buildBracket(competition);
    cache.set(competition, { data, at: Date.now() });
    return json(data);
  } catch (err: any) {
    console.error("[api/bracket]", err?.message ?? err);
    return json({ error: "No se pudo obtener las llaves del torneo" }, 502);
  }
};
