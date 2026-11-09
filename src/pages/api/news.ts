// Server-side proxy for sports news, fed by ESPN's public API in Spanish.
// Zero API keys, zero quotas. Merged feeds for breadth: global soccer,
// Argentine league and cups, and the two continental competitions.
//
// GET /api/news

export const prerender = false;

const ESPN_NEWS = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const FEEDS = [
  "all",
  "arg.1",
  "arg.copa",
  "arg.2",
  "conmebol.libertadores",
  "conmebol.sudamericana",
] as const;

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_ITEMS = 12;
const cache = new Map<string, { data: unknown; at: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string; caption?: string }>;
}

function mapArticle(article: EspnArticle) {
  const url = article.links?.web?.href ?? "";
  const title = (article.headline ?? "").trim();
  return {
    title,
    description: (article.description ?? "").trim(),
    url,
    image: article.images?.[0]?.url ?? "",
    caption: (article.images?.[0]?.caption ?? "").trim(),
    source: "ESPN",
    published: article.published ?? "",
  };
}

async function feed(slug: string) {
  const res = await fetch(`${ESPN_NEWS}/${slug}/news?lang=es`, {
    headers: { "user-agent": "MiXteam/2.0 (+portfolio project)" },
  });
  if (!res.ok) throw new Error(`ESPN news (${slug}) respondió ${res.status}`);
  const data = await res.json();
  return ((data.articles ?? []) as EspnArticle[])
    .map((article) => mapArticle(article))
    .filter((item) => item.title && item.url);
}

export const GET: APIRoute = async () => {
  const cached = cache.get("news");
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return json(cached.data);
  }

  try {
    // allSettled: one failing league must not take the whole news section down.
    const results = await Promise.allSettled(FEEDS.map((slug) => feed(slug)));
    const merged = new Map<string, ReturnType<typeof mapArticle>>();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const item of result.value) {
        // Dedup: the same story can surface in several league feeds.
        if (!merged.has(item.url)) merged.set(item.url, item);
      }
    }

    const items = Array.from(merged.values())
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, MAX_ITEMS);

    if (items.length === 0) throw new Error("sin noticias");

    const data = { items };
    cache.set("news", { data, at: Date.now() });
    return json(data);
  } catch (err: any) {
    console.error("[api/news]", err?.message ?? err);
    return json({ error: "servicio no disponible" }, 503);
  }
};
