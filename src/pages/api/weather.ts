// Server-side proxy for OpenWeather. Keeps the API key out of the browser.
// Legacy reference: legacy/js/weather.js (city coordinates preserved)
//
// GET /api/weather

export const prerender = false;

const OWM_URL =
  "https://api.openweathermap.org/data/2.5/weather?lat=-34.61315&lon=-58.37723&units=metric&lang=es";

/** Legacy key kept as fallback; still valid today. Rotate into env vars. */
const LEGACY_KEY = "92f1acb52c66fe442eea1eecf2a18cea";

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: unknown; at: number }>();

export const GET: APIRoute = async () => {
  const cached = cache.get("weather");
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const key = import.meta.env.OPENWEATHER_KEY ?? LEGACY_KEY;
  try {
    const res = await fetch(`${OWM_URL}&appid=${key}`);
    if (!res.ok) throw new Error(`OpenWeather respondió ${res.status}`);

    const payload = await res.json();
    const data = {
      temp: Math.round(payload.main?.temp ?? 0),
      description: payload.weather?.[0]?.description ?? "",
      icon: payload.weather?.[0]?.icon ?? "",
      city: payload.name ?? "Buenos Aires",
    };

    cache.set("weather", { data, at: Date.now() });
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("[api/weather]", err?.message ?? err);
    return new Response(JSON.stringify({ error: "servicio no disponible" }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};
