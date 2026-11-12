import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveAlerts, loadAlerts} from '../alerts-service.ts';

const base = {titles: new Map([['a1', 'Ember']]), artistOffers: [], artistOrders: [], buyerOffers: [], buyerOrders: [], artworkLinks: new Map([['a1', '/artwork/ember-a1']])};
const run = x => deriveAlerts({...base, ...x});
const keys = x => run(x).map(a => a.key);
const ao = (id, p) => ({id, artwork_id: 'a1', first_name: 'Sam', buyer_email: null, status: 'confirmed', payment_state: 'none', delivery_state: 'none', refund_state: 'none', ...p});
const bo = (id, p) => ({id, artwork_id: 'a1', offer_id: null, status: 'confirmed', payment_state: 'none', delivery_state: 'none', refund_state: 'none', qr_path_snapshot: '', upi_id_snapshot: 'a@upi', buyer_email: '', ...p});

test('nothing pending gives no alerts', () => assert.deepEqual(keys({}), []));

test('artist offers: only pending needs an answer', () => {
  const st = ['pending', 'countered', 'accepted', 'declined', 'withdrawn'];
  assert.deepEqual(keys({artistOffers: st.map((s, n) => ({id: 'o' + n, artwork_id: 'a1', status: s}))}), ['ao-o0']);
});

test('artist orders: every state', () => {
  const rows = [
    ao('pend', {status: 'pending'}),
    ao('declined', {status: 'declined'}), ao('withdrawn', {status: 'withdrawn'}),
    ao('conf-none', {}),
    ao('marked', {payment_state: 'buyer_marked'}),
    ao('missing', {payment_state: 'missing'}),
    ao('paid', {payment_state: 'received'}),
    ao('shipped', {payment_state: 'received', delivery_state: 'dispatched'}),
    ao('done', {payment_state: 'received', delivery_state: 'delivered'}),
    ao('c-req', {status: 'cancelled', refund_state: 'requested'}),
    ao('c-sent', {status: 'cancelled', refund_state: 'sent'}),
    ao('c-recv', {status: 'cancelled', refund_state: 'received'}),
    ao('c-nr', {status: 'cancelled', refund_state: 'not_received'}),
  ];
  assert.deepEqual(keys({artistOrders: rows}), ['ar-pend', 'ap-marked', 'ad-paid', 'af-c-req']);
});

test('artist links point at the exact row', () => {
  const r = run({artistOffers: [{id: 'O1', artwork_id: 'a1', status: 'pending'}], artistOrders: [ao('R1', {status: 'pending'}), ao('R2', {payment_state: 'buyer_marked'}), ao('R3', {payment_state: 'received'}), ao('R4', {status: 'cancelled', refund_state: 'requested'})]});
  assert.deepEqual(r.map(a => a.to), ['/my-artworks?focus=O1', '/my-artworks?focus=R1', '/orders?focus=R2', '/orders?focus=R3', '/orders?focus=R4']);
  assert.ok(r.every(a => a.role === 'artist'));
});

test('digital vs physical wording on dispatch', () => {
  assert.match(run({artistOrders: [ao('d', {payment_state: 'received', buyer_email: 'b@x.in'})]})[0].text, /Mark the file as sent/);
  assert.match(run({artistOrders: [ao('p', {payment_state: 'received'})]})[0].text, /courier and tracking/);
  assert.match(run({buyerOrders: [bo('d', {payment_state: 'received', delivery_state: 'dispatched', buyer_email: 'b@x.in'})]})[0].text, /file for Ember was marked sent/);
  assert.match(run({buyerOrders: [bo('p', {payment_state: 'received', delivery_state: 'dispatched'})]})[0].text, /dispatched/);
});

test('buyer orders: every state', () => {
  const rows = [
    bo('pend', {status: 'pending'}), bo('declined', {status: 'declined'}), bo('withdrawn', {status: 'withdrawn'}),
    bo('pay', {}), bo('nopay-details', {upi_id_snapshot: ''}),
    bo('marked', {payment_state: 'buyer_marked'}),
    bo('missing', {payment_state: 'missing'}),
    bo('paid', {payment_state: 'received'}),
    bo('ship', {payment_state: 'received', delivery_state: 'dispatched'}),
    bo('done', {payment_state: 'received', delivery_state: 'delivered'}),
    bo('c-req', {status: 'cancelled', refund_state: 'requested'}),
    bo('c-sent', {status: 'cancelled', refund_state: 'sent'}),
    bo('c-recv', {status: 'cancelled', refund_state: 'received'}),
    bo('c-nr', {status: 'cancelled', refund_state: 'not_received'}),
  ];
  assert.deepEqual(keys({buyerOrders: rows}), ['bp-pay', 'bm-missing', 'br-ship', 'bf-c-sent']);
  assert.ok(run({buyerOrders: rows}).every(a => a.role === 'buyer'));
});

test('missing payment never tells the buyer to pay again, and links to the order not the pay page', () => {
  const [a] = run({buyerOrders: [bo('m', {payment_state: 'missing'})]});
  assert.match(a.text, /transaction status in your UPI app/);
  assert.match(a.text, /Do not pay again until you know/);
  assert.doesNotMatch(a.text, /pay again\.$|Check and pay again/);
  assert.equal(a.to, '/orders?focus=m');
  assert.equal(run({buyerOrders: [bo('p', {})]})[0].to, '/orders/p/pay');
});

test('buyer offers: latest per artwork only, accepted without order links to the artwork', () => {
  const offers = [{id: 'new', artwork_id: 'a1', status: 'accepted'}, {id: 'old', artwork_id: 'a1', status: 'countered'}];
  const r = run({buyerOffers: offers});
  assert.deepEqual(r.map(a => a.key), ['ba-new']);
  assert.equal(r[0].to, '/artwork/ember-a1');
  assert.deepEqual(keys({buyerOffers: [{id: 'c', artwork_id: 'a1', status: 'countered'}]}), ['bo-c']);
  for (const s of ['pending', 'declined', 'withdrawn']) assert.deepEqual(keys({buyerOffers: [{id: 'x', artwork_id: 'a1', status: s}]}), []);
});

test('accepted offer clears once an order request exists for it or the artwork', () => {
  const accepted = [{id: 'o1', artwork_id: 'a1', status: 'accepted'}];
  assert.deepEqual(keys({buyerOffers: accepted, buyerOrders: [bo('r', {offer_id: 'o1', status: 'declined'})]}), []);
  assert.deepEqual(keys({buyerOffers: accepted, buyerOrders: [bo('r', {status: 'pending'})]}), []);
  assert.deepEqual(keys({buyerOffers: accepted, buyerOrders: [bo('r', {status: 'declined'})]}), ['ba-o1']);
});

test('offer alert needs a published artwork link', () => {
  assert.deepEqual(keys({buyerOffers: [{id: 'o', artwork_id: 'zz', status: 'countered'}]}), []);
});

test('resolved actions clear the count', () => {
  const before = keys({artistOrders: [ao('r', {payment_state: 'buyer_marked'})]});
  const after = keys({artistOrders: [ao('r', {payment_state: 'received', delivery_state: 'dispatched'})]});
  assert.equal(before.length, 1);
  assert.equal(after.length, 0);
});

/* loadAlerts with a fake client: failures must not read as "nothing to do" */
function fakeClient({offers = {data: [], error: null}, orders = {data: [], error: null}, rpc = {data: [], error: null}, user = 'u1'} = {}) {
  const chain = res => {const c = {select: () => c, eq: () => c, order: () => c, limit: () => Promise.resolve(res)}; return c;};
  return {
    auth: {getSession: async () => ({data: {session: user ? {user: {id: user}} : null}})},
    from: t => chain(t === 'offers' ? offers : orders),
    rpc: async () => rpc,
  };
}
const deps = (over = {}) => ({
  myArtworks: async () => [{id: 'a1', title: 'Ember', status: 'published'}],
  artistOrderRequests: async () => [ao('r', {payment_state: 'buyer_marked'})],
  offersForArtworks: async () => [{id: 'o', artwork_id: 'a1', status: 'pending'}],
  artworkParam: a => a.id,
  ...over,
});

test('loadAlerts: all reads fine is complete', async () => {
  const r = await loadAlerts(fakeClient(), deps());
  assert.equal(r.complete, true);
  assert.deepEqual(r.items.map(a => a.key), ['ao-o', 'ap-r']);
});
test('loadAlerts: signed out is empty and complete', async () => {
  assert.deepEqual(await loadAlerts(fakeClient({user: null}), deps()), {items: [], complete: true});
});
test('loadAlerts: artist reads failing is incomplete, never silently empty', async () => {
  const boom = async () => {throw new Error('net');};
  const r = await loadAlerts(fakeClient(), deps({myArtworks: boom}));
  assert.equal(r.complete, false);
  const r2 = await loadAlerts(fakeClient(), deps({artistOrderRequests: boom}));
  assert.equal(r2.complete, false);
  assert.deepEqual(r2.items.map(a => a.key), ['ao-o']);
  const r3 = await loadAlerts(fakeClient(), deps({offersForArtworks: boom}));
  assert.equal(r3.complete, false);
  assert.deepEqual(r3.items.map(a => a.key), ['ap-r']);
});
test('loadAlerts: buyer reads returning errors are incomplete', async () => {
  const err = {data: null, error: {message: 'rls'}};
  assert.equal((await loadAlerts(fakeClient({offers: err}), deps())).complete, false);
  assert.equal((await loadAlerts(fakeClient({orders: err}), deps())).complete, false);
  assert.equal((await loadAlerts(fakeClient({rpc: err, offers: {data: [{id: 'b', artwork_id: 'zz', status: 'countered'}], error: null}}), deps())).complete, false);
});
test('loadAlerts: buyer counter surfaces with the artwork link', async () => {
  const c = fakeClient({offers: {data: [{id: 'b', artwork_id: 'zz', status: 'countered'}], error: null}, rpc: {data: [{id: 'zz', title: 'Vessel'}], error: null}});
  const r = await loadAlerts(c, deps({myArtworks: async () => [], artistOrderRequests: async () => [], offersForArtworks: async () => []}));
  assert.deepEqual(r.items.map(a => [a.key, a.to]), [['bo-b', '/artwork/zz']]);
  assert.equal(r.complete, true);
});
