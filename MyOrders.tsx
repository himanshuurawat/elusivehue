import React, {useEffect, useRef, useState} from 'react';
import {WaitOrb} from './PublicPages';
import {Link} from 'react-router-dom';
import {accountRepository, configuredAccountClient, type Artwork} from './account-service';
import {artworkParam, type SharedArtwork} from './public-service';
import {artistOrderRequests, type ArtistOrderRequest, type MyOrderRequest} from './orders-service';
import {respondOrderPayment} from './payment-service';
import {ArtistDelivery, BuyerDelivery} from './DeliveryParts';
import './artwork-studio.css';

/*
 * One place for order requests: the ones you sent as a buyer, and the ones
 * sent for your own artworks. Read only. It reuses the existing safe reads
 * (your own rows, and artist_order_requests), so an artist still sees a
 * first name and a PIN prefix until a request is confirmed. Answering a
 * request stays on the artwork's selling panel.
 *
 * Payments: a confirmed order with the artist's details snapshotted shows
 * the buyer a Pay artist link to that order's own payment page. The artist
 * answers a buyer's paid mark from here, after checking their own UPI app.
 * The platform never touches the money.
 */

type Client = NonNullable<ReturnType<typeof configuredAccountClient>>;
type Sent = {req: MyOrderRequest; work: SharedArtwork | null};
type Received = {req: ArtistOrderRequest; title: string};

const label = (s: string): string => s[0].toUpperCase() + s.slice(1);
const rupees = (n: number): string => '₹' + n.toLocaleString('en-IN');

async function loadSent(client: Client): Promise<Sent[]> {
  const {data, error} = await client.from('order_requests').select('*').order('created_at', {ascending: false}).limit(50);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as MyOrderRequest[];
  const ids = [...new Set(rows.map(r => r.artwork_id))];
  const works = new Map<string, SharedArtwork | null>();
  await Promise.all(ids.map(async id => {
    const {data: found} = await client.rpc('published_artwork_by_prefix', {p_prefix: id.slice(0, 8)});
    const hit = ((found ?? []) as SharedArtwork[]).filter(w => w.id === id)[0];
    works.set(id, hit ?? null);
  }));
  return rows.map(req => ({req, work: works.get(req.artwork_id) ?? null}));
}

async function loadReceived(client: Client): Promise<Received[]> {
  const mine: Artwork[] = await accountRepository(client).myArtworks();
  const titles = new Map(mine.map(a => [a.id, a.title]));
  const rows = await artistOrderRequests(client, mine.filter(a => a.status === 'published').map(a => a.id));
  return rows.map(req => ({req, title: titles.get(req.artwork_id) ?? 'Artwork'}));
}

function PaymentAnswer({client, requestId, onDone}: {client: Client; requestId: string; onDone: (a: 'received' | 'missing') => void}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const answer = async (action: 'received' | 'missing') => {
    if (busy) return;
    setBusy(action); setError('');
    try {await respondOrderPayment(client, requestId, action); onDone(action);}
    catch (e) {setError(e instanceof Error ? e.message : 'Could not save your answer. Retry.');}
    finally {setBusy('');}
  };
  return <>
    <span className="pay-actions">
    <button type="button" className="pay-primary" disabled={Boolean(busy)} onClick={() => void answer('received')}>{busy === 'received' ? 'Saving...' : 'Payment received in my app'}</button>
    <button type="button" className="pay-secondary" disabled={Boolean(busy)} onClick={() => void answer('missing')}>{busy === 'missing' ? 'Saving...' : "I can't find this payment"}</button>
    </span>
    {error && <span role="alert"> {error}</span>}
  </>;
}

export function MyOrders() {
  const client = configuredAccountClient();
  const [session, setSession] = useState<boolean | null>(client ? null : false);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [received, setReceived] = useState<Received[] | null>(null);
  const [error, setError] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!client) return () => {mounted.current = false;};
    client.auth.getSession().then(({data}) => {
      if (!mounted.current) return;
      setSession(Boolean(data.session));
      if (!data.session) return;
      loadSent(client).then(r => mounted.current && setSent(r)).catch(e => {if (mounted.current) {setSent([]); setError(e instanceof Error ? e.message : 'Could not load your requests. Retry when connected.');}});
      loadReceived(client).then(r => mounted.current && setReceived(r)).catch(() => {if (mounted.current) setReceived([]);});
    }).catch(() => {if (mounted.current) setSession(false);});
    return () => {mounted.current = false;};
  }, []);

  return <main className="artwork-workspace">
    <header className="workspace-nav"><Link to="/">elusive · hue</Link><Link to="/account">Your account ↗</Link></header>
    <section className="workspace-body">
      <p className="kicker">Your orders</p>
      <h1 className="display">My orders.</h1>
      <p className="workspace-intro">Requests you sent, and requests for your art, in one place. Once the artist confirms, you pay them directly in your UPI app - nothing is charged here.</p>
      {session === false ? <div className="workspace-empty"><p>{client ? 'Sign in to see your order requests.' : 'Orders need the connected account setup.'}</p><Link to="/account">Go to sign in ↗</Link></div> : <>
        {error && <p role="alert">{error}</p>}
        <div className="orders-lists">
        <section className="selling-offers" aria-label="Requests you sent">
          <p className="selling-kicker">Requests you sent</p>
          {sent === null ? <WaitOrb label="Loading requests"/> : sent.length === 0 ? <p>You have not sent any order requests yet.</p> : <ul>{sent.map(({req, work}) => <li className="offer-row" key={req.id}>
            <div className="offer-row-top"><strong>{work ? work.title : 'Artwork no longer shared'}</strong><span className={`offer-status offer-status-${req.status}`}>{label(req.status)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr + req.delivery_fee_inr)}{req.delivery_fee_inr > 0 ? ` (${rupees(req.amount_inr)} + ${rupees(req.delivery_fee_inr)} delivery)` : ''}{req.status === 'pending' ? ' · waiting for the artist' : req.status === 'confirmed' ? ' · confirmed by the artist' : ''}</p>
            {req.status === 'confirmed' && (req.qr_path_snapshot || req.upi_id_snapshot) && <p className="offer-time">{req.payment_state === 'received' ? 'Payment received by the artist · ' : req.payment_state === 'buyer_marked' ? 'Artist is checking your payment · ' : req.payment_state === 'missing' ? 'Artist could not find the payment yet · ' : ''}<Link to={`/orders/${req.id}/pay`}>Pay artist ↗</Link></p>}
            {req.status === 'confirmed' && <BuyerDelivery client={client!} order={req} onChanged={s => setSent(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, delivery_state: s}} : r))}/>}
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{work ? <> · <Link to={`/artwork/${artworkParam(work)}`}>Open artwork ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        <section className="selling-offers" aria-label="Requests for your art">
          <p className="selling-kicker">Requests for your art</p>
          {received === null ? <WaitOrb label="Loading requests"/> : received.length === 0 ? <p>No one has sent a request for your artworks yet.</p> : <ul>{received.map(({req, title}) => <li className="offer-row" key={req.id}>
            <div className="offer-row-top"><strong>{title}</strong><span className={`offer-status offer-status-${req.status}`}>{label(req.status)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr + req.delivery_fee_inr)}{req.delivery_fee_inr > 0 ? ` (${rupees(req.amount_inr)} + ${rupees(req.delivery_fee_inr)} delivery)` : ''} · {req.first_name}{req.area ? ` · area ${req.area}` : ''}{req.status === 'confirmed' ? '. Contact details are on the artwork.' : '. Full contact details appear after you confirm.'}</p>
            {req.status === 'confirmed' && req.payment_state === 'buyer_marked' && <p className="offer-note"><strong>{req.first_name} says they paid {rupees(req.amount_inr + req.delivery_fee_inr)}.</strong> Check your own UPI app - a screenshot is never proof.</p>}
            {req.status === 'confirmed' && req.payment_state === 'buyer_marked' && <p className="offer-time"><PaymentAnswer client={client!} requestId={req.id} onDone={a => setReceived(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, payment_state: a}} : r))}/></p>}
            {req.status === 'confirmed' && req.payment_state === 'received' && <p className="offer-note">You confirmed receiving {rupees(req.amount_inr + req.delivery_fee_inr)} from your own app.</p>}
            {req.status === 'confirmed' && req.payment_state === 'missing' && <p className="offer-note">You could not find this payment yet. It returns here when the buyer marks it again.</p>}
            {req.status === 'confirmed' && <ArtistDelivery client={client!} order={req} onChanged={v => setReceived(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, ...v, delivery_state: 'dispatched'}} : r))}/>}
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{req.status === 'pending' ? <> · <Link to="/my-artworks">Answer in My artworks ↗</Link></> : req.status === 'confirmed' ? <> · <Link to="/my-artworks">Open in My artworks ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        </div>
      </>}
    </section>
    <footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
