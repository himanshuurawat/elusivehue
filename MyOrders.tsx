import React, {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {accountRepository, configuredAccountClient, type Artwork} from './account-service';
import {artworkParam, type SharedArtwork} from './public-service';
import {artistOrderRequests, type ArtistOrderRequest, type MyOrderRequest} from './orders-service';
import './artwork-studio.css';

/*
 * One place for order requests: the ones you sent as a buyer, and the ones
 * sent for your own artworks. Read only. It reuses the existing safe reads
 * (your own rows, and artist_order_requests), so an artist still sees a
 * first name and a PIN prefix until a request is confirmed. Answering a
 * request stays on the artwork's selling panel. No payment, no new data.
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
      <p className="workspace-intro">Requests you sent, and requests for your art, in one place. Payments are not connected yet, so nothing is charged.</p>
      {session === false ? <div className="workspace-empty"><p>{client ? 'Sign in to see your order requests.' : 'Orders need the connected account setup.'}</p><Link to="/account">Go to sign in ↗</Link></div> : <>
        {error && <p role="alert">{error}</p>}
        <div className="orders-lists">
        <section className="selling-offers" aria-label="Requests you sent">
          <p className="selling-kicker">Requests you sent</p>
          {sent === null ? <p role="status">Loading requests...</p> : sent.length === 0 ? <p>You have not sent any order requests yet.</p> : <ul>{sent.map(({req, work}) => <li className="offer-row" key={req.id}>
            <div className="offer-row-top"><strong>{work ? work.title : 'Artwork no longer shared'}</strong><span className={`offer-status offer-status-${req.status}`}>{label(req.status)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr)}{req.status === 'pending' ? ' · waiting for the artist' : req.status === 'confirmed' ? ' · confirmed by the artist' : ''}</p>
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{work ? <> · <Link to={`/artwork/${artworkParam(work)}`}>Open artwork ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        <section className="selling-offers" aria-label="Requests for your art">
          <p className="selling-kicker">Requests for your art</p>
          {received === null ? <p role="status">Loading requests...</p> : received.length === 0 ? <p>No one has sent a request for your artworks yet.</p> : <ul>{received.map(({req, title}) => <li className="offer-row" key={req.id}>
            <div className="offer-row-top"><strong>{title}</strong><span className={`offer-status offer-status-${req.status}`}>{label(req.status)}</span></div>
            <p className="offer-note">{rupees(req.amount_inr)} · {req.first_name}{req.area ? ` · area ${req.area}` : ''}{req.status === 'confirmed' ? '. Contact details are on the artwork.' : '. Full contact details appear after you confirm.'}</p>
            <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}{req.status === 'pending' ? <> · <Link to="/my-artworks">Answer in My artworks ↗</Link></> : req.status === 'confirmed' ? <> · <Link to="/my-artworks">Open in My artworks ↗</Link></> : null}</p>
          </li>)}</ul>}
        </section>
        </div>
      </>}
    </section>
    <footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
