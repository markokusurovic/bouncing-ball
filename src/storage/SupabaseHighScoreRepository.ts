import type { HighScoreRepository } from '../engine/core/interfaces';
import { parseHighScores, type HighScore } from '../engine/scoring/highScores';

export interface SupabaseOptions {
  /** Project URL, e.g. `https://abc.supabase.co`. */
  readonly url: string;
  /** Publishable (or legacy anon) key. Public by design; never the secret key. */
  readonly key: string;
  readonly maxEntries: number;
  /** Requests slower than this fail, so the local fallback takes over. */
  readonly timeoutMs: number;
  /** Injected for tests; defaults to the browser's `fetch`. */
  readonly fetch?: typeof fetch;
}

/**
 * One global table in the Supabase `high_scores` table, using plain `fetch`
 * against its REST API. Row Level Security only allows reading and inserting.
 * Every failure (offline, timeout, HTTP error) rejects, so a fallback can
 * take over.
 */
export class SupabaseHighScoreRepository implements HighScoreRepository {
  private readonly endpoint: string;
  private readonly fetch: typeof fetch;

  constructor(private readonly options: SupabaseOptions) {
    this.endpoint = `${options.url.replace(/\/+$/, '')}/rest/v1/high_scores`;
    this.fetch = options.fetch ?? ((input, init) => fetch(input, init));
  }

  async load(): Promise<HighScore[]> {
    const query = `select=initials,score,level&order=score.desc,created_at.asc&limit=${this.options.maxEntries}`;
    const response = await this.request(`${this.endpoint}?${query}`, {});
    return parseHighScores(await response.json());
  }

  async add({ initials, score, level }: HighScore): Promise<void> {
    await this.request(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ initials, score, level }),
    });
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const response = await this.fetch(url, {
      ...init,
      headers: { ...init.headers, apikey: this.options.key },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    });
    if (!response.ok) throw new Error(`Supabase: HTTP ${response.status}`);
    return response;
  }
}
