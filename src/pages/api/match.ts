// JSON detail for /match/[id]: the page renders its first version
// server-side and polls this endpoint every 60s while the match is on.
// Same zero-key proxy rule: ESPN is only ever reached from the server.
//
// GET /api/match?id=401876904

import type { APIRoute } from "astro";
import {
  fetchMatchDetail,
  isValidEventId,
  eventsHtml,
  statsHtml,
  halvesHtml,
} from "../../lib/matchDetail";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("id") ?? "";
  if (!isValidEventId(id)) return json({ error: "id inválido" }, 400);

  try {
    const detail = await fetchMatchDetail(id);
    if (!detail) return json({ error: "partido no encontrado" }, 404);

    // The html bundle travels with the data: the client swaps a section
    // with the same markup the server rendered, so templates live once.
    return json({
      detail,
      html: {
        events: eventsHtml(detail),
        stats: statsHtml(detail),
        halves: halvesHtml(detail),
      },
    });
  } catch (err: any) {
    console.error("[api/match]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
