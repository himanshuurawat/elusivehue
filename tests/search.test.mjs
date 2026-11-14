import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPublic} from '../public-search.ts';

/* Duck-typed Supabase stub: query builders are thenable, each method returns
 * the builder, and awaiting it resolves {data, error}. */
const stubClient = ({profiles = [], works = [], signed = [], profileError = null, workError = null} = {}) => {
  const calls = [];
  const builder = (table, rows, error) => {
    const b = {
      table,
      filters: [],
      select(c) { b.filters.push(['select', c]); return b; },
      eq(k, v) { b.filters.push(['eq', k, v]); return b; },
      ilike(k, p) { b.filters.push(['ilike', k, p]); return b; },
      or(s) { b.filters.push(['or', s]); return b; },
      order(k, o) { b.filters.push(['order', k]); return b; },
      limit(n) { b.filters.push(['limit', n]); return b; },
      then(res, rej) { return Promise.resolve({data: rows, error}).then(res, rej); },
    };
    calls.push(b);
    return b;
  };
  return {
    calls,
    from(table) { return table === 'profiles' ? builder('profiles', profiles, profileError) : builder('artworks', works, workError); },
    storage: {from: () => ({createSignedUrls: async paths => ({data: paths.map(p => ({path: p, signedUrl: signed.includes(p) ? `signed:${p}` : null})), error: null})})},
  };
};

const work = (id, title) => ({id, owner_id: 'o1', title, medium: 'Ink', format: 'Physical', size_class: 'M', width: 10, height: 10, unit: 'cm', asking_price_inr: 12000, description: '', for_sale: true, sold_out: false, delivery_fee_inr: 0, image_path: `p/${id}.webp`, created_at: '2026-11-01'});

test('short or blank queries never touch the backend', async () => {
  const c = stubClient();
  assert.deepEqual(await searchPublic(c, ''), {artists: [], works: []});
  assert.deepEqual(await searchPublic(c, ' a '), {artists: [], works: []});
  assert.equal(c.calls.length, 0);
});

test('artist search matches username or display name, limited, public fields only', async () => {
  const c = stubClient({profiles: [{id: 'p1', username: 'meera_inks', display_name: 'Meera', bio: 'ink'}]});
  const r = await searchPublic(c, 'meera');
  assert.equal(r.artists.length, 1);
  const prof = c.calls.find(b => b.table === 'profiles');
  assert.deepEqual(prof.filters, [['select', 'id,username,display_name,bio'], ['or', 'username.ilike.%meera%,display_name.ilike.%meera%'], ['limit', 6]]);
});

test('work search is published-only by title and maps signed photos', async () => {
  const c = stubClient({works: [work('w1', 'Ember Study'), work('w2', 'Ember Rain')], signed: ['p/w1.webp']});
  const r = await searchPublic(c, 'ember');
  assert.equal(r.works.length, 2);
  assert.equal(r.works[0].photo, 'signed:p/w1.webp');
  assert.equal(r.works[1].photo, '');
  const w = c.calls.find(b => b.table === 'artworks');
  assert.deepEqual(w.filters.slice(0, 3), [['select', '*'], ['eq', 'status', 'published'], ['ilike', 'title', '%ember%']]);
});

test('query is sanitized before it reaches a filter pattern', async () => {
  const c = stubClient();
  await searchPublic(c, 'a%,(x)._"b"\\');
  const prof = c.calls.find(b => b.table === 'profiles');
  assert.deepEqual(prof.filters[1], ['or', 'username.ilike.%ax_b%,display_name.ilike.%ax_b%']);
});

test('backend errors surface instead of rendering empty results', async () => {
  await assert.rejects(() => searchPublic(stubClient({profileError: {message: 'rls'}}), 'meera'), /rls/);
  await assert.rejects(() => searchPublic(stubClient({workError: {message: 'down'}}), 'meera'), /down/);
});
