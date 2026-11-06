# MiXteam

Arma y mezcla los equipos para tu fulbito. Seguimiento del fútbol argentino:
Liga Profesional, Copa Libertadores y Copa Sudamericana, con noticias en vivo.

> The original hand-built site (vanilla HTML/CSS/JS, 2023–2024) is kept in
> [`legacy/`](./legacy/) for reference. This version is rebuilt on a modern stack.

## Stack

- [Astro](https://astro.build) 7 — static pages, zero runtime JS by default
- Vanilla TypeScript islands for interactive parts (team mixer, data tabs)
- Server endpoints as API proxies — no third-party API key ever ships to the browser
- Deployed on Vercel (adapter `@astrojs/vercel`)

## Features

- **Team mixer** — add players, shuffle with Fisher–Yates, split into two
  balanced teams, share on WhatsApp. State persists in `localStorage`.
- **Competitions** — standings, results, upcoming fixtures and live matches via
  `src/pages/api/football.ts` (proxies API-Football, 5-minute cache).
- **News** — Google News RSS (Spanish, topic: fútbol argentino) via
  `src/pages/api/news.ts`. No API key needed, 10-minute cache.
- **Weather chip** — Buenos Aires forecast in the header via
  `src/pages/api/weather.ts` (proxies OpenWeather).

## Getting started

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static build + serverless entry
```

## Environment variables

Create a `.env` file (see nothing below is required to boot; feature UIs
degrade gracefully without data):

| Variable          | Used by       | Where to get it                              |
| ----------------- | ------------- | -------------------------------------------- |
| `API_FOOTBALL_KEY`| `/api/football` | Free key at <https://www.api-football.com> |
| `OPENWEATHER_KEY` | `/api/weather`     | Free key at <https://openweathermap.org>   |

Keys are read **server-side only**. Never put them in client code.

## Project structure

```
src/
  components/   UI pieces (mixer, data tabs, news grid, weather chip)
  layouts/      BaseLayout with SEO + Open Graph
  pages/        One route per page + /api/* server endpoints
  styles/       Design tokens and global stylesheet
public/         Static assets served as-is
legacy/         The original 2023 hand-built site, kept for reference
```
