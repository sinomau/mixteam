// Shared ESPN transport for every /api/* route: public endpoints, zero API
// keys, no plans, no quotas — the same rule since /api/live started calling it.
//
// The request pattern is identical everywhere (BBC-style attribution UA, no
// keys), and the transport has a curl fallback: ESPN's edge (Akamai)
// fingerprint-blocks Node's fetch client after enough traffic — observed on
// 2026-11-08 as 403 Access Denied on every HTTPS call from this process while
// the same URLs kept answering over curl. Spawning curl keeps the data flowing
// in that state; in the normal case fetch answers and the fallback never runs.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const USER_AGENT = "MiXteam/2.0 (+portfolio project)";

/** curl is passed the URL as one argv (execFile, not exec): no shell, no injection. */
async function espnViaCurl(url: string, reason: string): Promise<any> {
  const { stdout } = await run("curl", ["-sf", "--max-time", "30", "-A", USER_AGENT, url], {
    maxBuffer: 16 * 1024 * 1024,
  });
  console.warn(`[lib/espn] fetch failed (${reason}); served from curl`);
  return JSON.parse(stdout);
}

/**
 * Fetch one ESPN endpoint as JSON.
 * Throws with the HTTP status surfaced ("ESPN respondió <status>") when both
 * transports fail, so each route decides its own fallback/error copy.
 */
export async function espn(url: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  } catch (error: any) {
    return espnViaCurl(url, String(error?.message ?? error));
  }
  if (!res.ok) {
    // 403 is the edge fingerprint block, 429 a rate beat: retry the same
    // bytes through curl instead of surfacing the failure to the page.
    if (res.status === 403 || res.status === 429) {
      return espnViaCurl(url, `ESPN respondió ${res.status}`);
    }
    throw new Error(`ESPN respondió ${res.status}`);
  }
  return res.json();
}
