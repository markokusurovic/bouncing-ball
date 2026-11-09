import { describe, expect, it } from 'vitest';
import { SupabaseHighScoreRepository } from '../../src/storage/SupabaseHighScoreRepository';

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(status: number, body: unknown = null) {
  const calls: Call[] = [];
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return Promise.resolve(
      new Response(body === null ? null : JSON.stringify(body), { status }),
    );
  };
  return { calls, fetch };
}

function repository(fetch: typeof globalThis.fetch) {
  return new SupabaseHighScoreRepository({
    url: 'https://abc.supabase.co/',
    key: 'sb_publishable_test',
    maxEntries: 10,
    timeoutMs: 1000,
    fetch,
  });
}

describe('SupabaseHighScoreRepository', () => {
  it('loads the top entries, best first, with the public key', async () => {
    const { calls, fetch } = fakeFetch(200, [
      { initials: 'ABC', score: 900, level: 4 },
      { initials: 'bad', score: 5, level: 1 },
    ]);
    expect(await repository(fetch).load()).toEqual([
      { initials: 'ABC', score: 900, level: 4 },
    ]);
    const [call] = calls;
    expect(call?.url).toBe(
      'https://abc.supabase.co/rest/v1/high_scores?select=initials,score,level&order=score.desc,created_at.asc&limit=10',
    );
    expect(call?.init.headers).toMatchObject({ apikey: 'sb_publishable_test' });
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it('inserts one entry with only the known fields', async () => {
    const { calls, fetch } = fakeFetch(201);
    await repository(fetch).add({ initials: 'XYZ', score: 70, level: 2 });
    const [call] = calls;
    expect(call?.init.method).toBe('POST');
    expect(call?.url).toBe('https://abc.supabase.co/rest/v1/high_scores');
    expect(JSON.parse(String(call?.init.body))).toEqual({
      initials: 'XYZ',
      score: 70,
      level: 2,
    });
    expect(call?.init.headers).toMatchObject({
      apikey: 'sb_publishable_test',
      'Content-Type': 'application/json',
    });
  });

  it('rejects on HTTP errors', async () => {
    const { fetch } = fakeFetch(404, { code: 'PGRST205' });
    await expect(repository(fetch).load()).rejects.toThrow('HTTP 404');
    await expect(
      repository(fetch).add({ initials: 'A', score: 1, level: 1 }),
    ).rejects.toThrow('HTTP 404');
  });
});
