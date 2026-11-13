import React, {useEffect, useRef, useState} from 'react';
import {WaitOrb} from './PublicPages';
import {Link} from 'react-router-dom';
import {accountRepository, configuredAccountClient, type Artwork} from './account-service';
import {artworkParam, type SharedArtwork} from './public-service';
import {artistOrderRequests, orderBadge, type ArtistOrderRequest, type MyOrderRequest} from './orders-service';
import {respondOrderPayment} from './payment-service';
import {ArtistDelivery, BuyerDelivery} from './DeliveryParts';
import {ArtistRefund, BuyerCancel, BuyerRefund} from './RefundParts';
import {loadAlerts, type AlertItem} from './alerts-service';
import {useFocusTarget} from './focus-target';
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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertsComplete, setAlertsComplete] = useState(true);
  const [alertsTick, setAlertsTick] = useState(0);
  const [sentFailed, setSentFailed] = useState(false);
  const [receivedFailed, setReceivedFailed] = useState(false);
  useFocusTarget();
  const mounted = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const reloading = useRef(false);

  /* One reload path for first load, the Refresh button and returning to the tab. No background polling.
     The ref guard collapses the focus + visibilitychange pair that fires together on tab return. */
  const reload = async () => {
    if (!client || reloading.current) return;
    reloading.current = true;
    setRefreshing(true);
    try {
      const [s, r] = await Promise.all([
        loadSent(client).catch(e => {if (mounted.current) {setSent(prev => prev ?? []); setSentFailed(true); setError(e instanceof Error ? e.message : 'Could not load your requests. Retry when connected.');} return null;}),
        loadReceived(client).catch(() => {if (mounted.current) {setReceived(prev => prev ?? []); setReceivedFailed(true);} return null;}),
      ]);
      if (!mounted.current) return;
      if (s) {setSent(s); setSentFailed(false); setError('');}
      if (r) {setReceived(r); setReceivedFailed(false);}
    } finally {reloading.current = false; if (mounted.current) setRefreshing(false);}
  };
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    mounted.current = true;
    if (!client) return () => {mounted.current = false;};
    client.auth.getSession().then(({data}) => {
      if (!mounted.current) return;
      setSession(Boolean(data.session));
      if (!data.session) return;
      void reloadRef.current();
    }).catch(() => {if (mounted.current) setSession(false);});
    return () => {mounted.current = false;};
  }, []);

  /* Fresh data when you come back to this tab. */
  useEffect(() => {
    if (!client || session !== true) return;
    const onVisible = () => {if (document.visibilityState === 'visible') void reloadRef.current();};
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible);};
  }, [session]);

  /* Recheck after the first load and after every change on this page, so resolved actions leave the list. */
  useEffect(() => {
    if (!client || session !== true || sent === null || received === null) return;
    let live = true;
    loadAlerts(client).then(r => {if (live) {setAlerts(r.items); setAlertsComplete(r.complete);}}).catch(() => {if (live) setAlertsComplete(false);});
    return () => {live = false;};
  }, [session, sent, received, alertsTick]);

  return <main className="artwork-workspace">
    <header className="workspace-nav"><Link to="/">elusive · hue</Link><Link to="/account">Your account ↗</Link></header>
    <section className="workspace-body">
      <p className="kicker">Your orders</p>
      <h1 className="display">My orders.</h1>
      <p className="workspace-intro">Requests you sent, and requests for your art, in one place. Once the artist confirms, you pay them directly in your UPI app - nothing is charged here.</p>
      {session === true && <div className="workspace-actions"><button disabled={refreshing} onClick={() => void reload()}>{refreshing ? <><WaitOrb inline size={18} label="Refreshing orders"/>Refreshing</> : 'Refresh orders'}</button></div>}
      {session === false ? <div className="workspace-empty"><p>{client ? 'Sign in to see your order requests.' : 'Orders need the connected account setup.'}</p><Link to="/account">Go to sign in ↗</Link></div> : <>
        {error && <p role="alert">{error}</p>}
        {!alertsComplete && <p role="status" className="needs-you-warn">Some requests could not be checked just now, so this list may be missing items. <button type="button" className="pay-copy" onClick={() => setAlertsTick(t => t + 1)}>Check again</button></p>}
        {alerts.length > 0 && <section className="needs-you" aria-label="Needs your action"><p className="selling-kicker">Needs your action ({alerts.length})</p><ul>{alerts.map(a => <li key={a.key}><span className="needs-role">{a.role === 'artist' ? 'As artist' : 'As buyer'}</span> {a.text} <Link to={a.to}>Open ↗</Link></li>)}</ul></section>}
        <div className="orders-lists">
        <section className="selling-offers" aria-label="Requests you sent">
          <p className="selling-kicker">Requests you sent</p>
          {sent === null ? <WaitOrb label="Loading requests"/> : sent.length === 0 ? (sentFailed ? <p role="alert">Could not load the requests you sent. Reload the page to try again.</p> : <p>You have not sent any order requests yet.</p>) : <ul>{sent.map(({req, work}) => <li className="offer-row" key={req.id} data-focus-id={req.id}>
            <div className="offer-row-top"><strong>{work ? work.title : 'Artwork no longer shared'}</strong><span className={`offer-status offer-status-${req.status}`}>{orderBadge(req.status, req.delivery_state, req.refund_state, !!req.buyer_email)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr + req.delivery_fee_inr)}{req.delivery_fee_inr > 0 ? ` (${rupees(req.amount_inr)} + ${rupees(req.delivery_fee_inr)} delivery)` : ''}{req.status === 'pending' ? ' · waiting for the artist' : req.status === 'confirmed' ? ' · confirmed by the artist' : ''}</p>
            {req.status === 'confirmed' && (req.qr_path_snapshot || req.upi_id_snapshot) && <p className="offer-time">{req.payment_state === 'received' ? 'Payment received by the artist · ' : req.payment_state === 'buyer_marked' ? 'Artist is checking your payment · ' : req.payment_state === 'missing' ? 'Artist could not find the payment yet · ' : ''}<Link to={`/orders/${req.id}/pay`}>Pay artist ↗</Link></p>}
            {req.status === 'confirmed' && <BuyerDelivery client={client!} order={req} onChanged={s => setSent(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, delivery_state: s}} : r))}/>}
            {req.status === 'confirmed' && <BuyerCancel client={client!} order={req} onChanged={v => setSent(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, ...v}} : r))}/>}
            {req.status === 'cancelled' && <BuyerRefund client={client!} order={req} onChanged={v => setSent(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, ...v}} : r))}/>}
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{work ? <> · <Link to={`/artwork/${artworkParam(work)}`}>Open artwork ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        <section className="selling-offers" aria-label="Requests for your art">
          <p className="selling-kicker">Requests for your art</p>
          {received === null ? <WaitOrb label="Loading requests"/> : received.length === 0 ? (receivedFailed ? <p role="alert">Could not load requests for your art. Reload the page to try again.</p> : <p>No one has sent a request for your artworks yet.</p>) : <ul>{received.map(({req, title}) => <li className="offer-row" key={req.id} data-focus-id={req.id}>
            <div className="offer-row-top"><strong>{title}</strong><span className={`offer-status offer-status-${req.status}`}>{orderBadge(req.status, req.delivery_state, req.refund_state, !!req.buyer_email)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr + req.delivery_fee_inr)}{req.delivery_fee_inr > 0 ? ` (${rupees(req.amount_inr)} + ${rupees(req.delivery_fee_inr)} delivery)` : ''} · {req.first_name}{req.area ? ` · area ${req.area}` : ''}{req.status === 'confirmed' ? '. Contact details are on the artwork.' : req.status === 'cancelled' ? '.' : '. Full contact details appear after you confirm.'}</p>
            {req.status === 'confirmed' && req.payment_state === 'buyer_marked' && <p className="offer-note"><strong>{req.first_name} says they paid {rupees(req.amount_inr + req.delivery_fee_inr)}.</strong> Check your own UPI app - a screenshot is never proof.</p>}
            {req.status === 'confirmed' && req.payment_state === 'buyer_marked' && <p className="offer-time"><PaymentAnswer client={client!} requestId={req.id} onDone={a => setReceived(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, payment_state: a}} : r))}/></p>}
            {req.status === 'confirmed' && req.payment_state === 'received' && <p className="offer-note">You confirmed receiving {rupees(req.amount_inr + req.delivery_fee_inr)} from your own app.</p>}
            {req.status === 'confirmed' && req.payment_state === 'missing' && <p className="offer-note">You could not find this payment yet. It returns here when the buyer marks it again.</p>}
            {req.status === 'confirmed' && <ArtistDelivery client={client!} order={req} onChanged={v => setReceived(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, ...v, delivery_state: 'dispatched'}} : r))}/>}
            {req.status === 'cancelled' && <ArtistRefund client={client!} order={req} onChanged={v => setReceived(list => (list ?? []).map(r => r.req.id === req.id ? {...r, req: {...r.req, ...v}} : r))}/>}
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{req.status === 'pending' ? <> · <Link to="/my-artworks">Answer in My artworks ↗</Link></> : req.status === 'confirmed' ? <> · <Link to="/my-artworks">Open in My artworks ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        </div>
      </>}
    </section>
    <footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
