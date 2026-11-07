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
    .replace(/&nbsp;/gi, " ")
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

    // Google News titles end with " - SourceName"; split it into its own label
    // so cards read clean and the source is honest about where it comes from.
    const lastDash = rawTitle.lastIndexOf(" - ");
    const source =
      decodeEntities(pick("source")) ||
      (lastDash !== -1 ? decodeEntities(rawTitle.slice(lastDash + 3)).trim() : "");
    const title = tagLess(
      lastDash !== -1 ? decodeEntities(rawTitle.slice(0, lastDash)) : decodeEntities(rawTitle)
    );
    let description =
      tagLess(decodeEntities(pick("description"))).slice(0, 280) || "";
    // Google News double-escapes entities and repeats the title at the start
    // of the description; decode again, drop the title, collapse whitespace.
    description = decodeEntities(description)
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (title && description.toLowerCase().startsWith(title.toLowerCase())) {
      description = description
        .slice(title.length)
        .replace(/^[\s\-–:·—]+/, "");
    }
    if (!description) description = "";
    // If the summary degenerates to just the source name again, it adds
    // nothing — drop it so the card shows title + source only.
    if (source && description.toLowerCase() === source.toLowerCase()) {
      description = "";
    }

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
