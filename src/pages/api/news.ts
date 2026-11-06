// Server-side proxy for sports news, fed by Google News RSS in Spanish
// (es-419, topic: fútbol argentino). Zero API keys, zero quotas.
// Legacy reference: legacy/js/news.js (news67 has no key-lifetime guarantee)
//
// GET /api/news

export const prerender = false;

const FEED_URL =
  "https://news.google.com/rss/search?q=futbol+argentino&hl=es-419&gl=AR&ceid=AR:es-419";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 12;
const cache = new Map<string, { data: unknown; at: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&Aacute;|&aacute;/g, "á")
    .replace(/&Eacute;|&eacute;/g, "é")
    .replace(/&Iacute;|&iacute;/g, "í")
    .replace(/&Oacute;|&oacute;/g, "ó")
    .replace(/&Uacute;|&uacute;/g, "ú")
    .replace(/&Ntilde;|&ntilde;/g, "ñ")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagLess(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minimal RSS extraction: enough structure, zero parsing dependencies. */
function parseItems(xml: string) {
  const items: Array<{ title: string; description: string; url: string; source: string; published: string }> = [];
  const blocks = xml.split("<item>").slice(1);

  for (const block of blocks) {
    const pick = (tag: string): string => {
      const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : "";
    };

    const rawTitle = pick("title");
    const url = pick("link");
    if (!rawTitle || !url) continue;

    const source = decodeEntities(pick("source"));
    const title = tagLess(decodeEntities(rawTitle));
    const description =
      tagLess(decodeEntities(pick("description"))).slice(0, 280) ||
      (source ? `Noticia de ${source}` : "Sin resumen disponible");

    items.push({ title, description, url, source, published: pick("pubDate") });
  }

  return items.slice(0, MAX_ITEMS);
}

export const GET: APIRoute = async () => {
  const cached = cache.get("news");
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.data);
  }

  try {
    const res = await fetch(FEED_URL, {
      headers: { "user-agent": "MiXteam/2.0 (+portfolio project)" },
    });
    if (!res.ok) throw new Error(`Google News respondió ${res.status}`);

    const xml = await res.text();
    const data = { items: parseItems(xml) };

    if (data.items.length === 0) throw new Error("feed vacío");

    cache.set("news", { data, at: Date.now() });
    return json(data);
  } catch (err: any) {
    console.error("[api/news]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
