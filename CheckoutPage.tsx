import React, {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {
  artworkParam,
  artistParam,
  loadArtworkBundle,
  publicClient,
  sharedPhotoUrl,
  type ArtworkBundle,
} from './public-service';
import {myOfferForArtwork, type Offer} from './offers-service';
import {myOrderForArtwork, sendOrderRequest, withdrawOrderRequest, type MyOrderRequest} from './orders-service';
import {PublicFooter, PublicHeader, PublicLoading, rise} from './PublicPages';
import './public-pages.css';

/*
 * Order request for one listed artwork. The buyer sends their details and
 * the artist confirms or declines. Payments are not connected: nothing is
 * charged and the listing is not reserved. An accepted offer is requested
 * at its agreed price; otherwise the asking price applies.
 */
export function CheckoutPage() {
  const {slug = ''} = useParams<{slug: string}>();
  const client = publicClient();
  const [state, setState] = useState<{bundle: ArtworkBundle | null; photo: string; checked: boolean}>({
    bundle: null,
    photo: '',
    checked: !client,
  });
  const [order, setOrder] = useState<MyOrderRequest | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState({name: '', phone: '', address: '', pin: '', email: ''});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    setState({bundle: null, photo: '', checked: !client});
    setOrder(null);
    setOffer(null);
    setError('');
    window.scrollTo(0, 0);
    if (!client) return;
    let live = true;
    loadArtworkBundle(client, slug)
      .then(async (bundle) => {
        let photo = '';
        if (bundle) {
          try {
            photo = await sharedPhotoUrl(client, bundle.work.image_path);
          } catch {
            photo = '';
          }
        }
        if (bundle) {
          try {
            const [o, off] = await Promise.all([myOrderForArtwork(client, bundle.work.id), myOfferForArtwork(client, bundle.work.id)]);
            if (live) {
              setOrder(o);
              setOffer(off && off.status === 'accepted' ? off : null);
              setNeedsSignIn(false);
            }
          } catch {
            if (live) setNeedsSignIn(true);
          }
        }
        if (live) setState({bundle, photo, checked: true});
      })
      .catch(() => {
        if (live) setState({bundle: null, photo: '', checked: true});
      });
    return () => {
      live = false;
    };
  }, [slug]);

  if (!state.checked || !client) return <PublicLoading label="Opening checkout" />;
  const bundle = state.bundle;

  if (!bundle || !bundle.work.for_sale) {
    return (
      <div className="pub-space">
        <PublicHeader />
        <main className="pub-checkout">
          <p className="pub-kicker pub-rise" style={rise('0.06s')}>
            Checkout
          </p>
          <h1 className="pub-title pub-rise" style={rise('0.12s')}>
            Not on the shelf.
          </h1>
          <p className="pub-note pub-rise" style={rise('0.2s')}>
            This artwork is not listed for sale. <Link className="pub-inline-link" to="/gallery">Back to the gallery</Link>
          </p>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const {work, artist} = bundle;
  const name = artist.display_name || (artist.username ? '@' + artist.username : 'Artist');
  const price = offer ? offer.amount_inr : work.asking_price_inr;
  const money = '₹' + price.toLocaleString('en-IN');
  const physical = work.format === 'Physical';
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({...form, [k]: e.target.value});
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setOrder(await sendOrderRequest(client, work.id, {...form, pin: form.pin.trim()}, offer));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the request. Retry when connected.');
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async () => {
    if (!order || busy) return;
    setBusy(true);
    setError('');
    try {
      await withdrawOrderRequest(client, order.id);
      setOrder({...order, status: 'withdrawn'});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not withdraw. Retry when connected.');
    } finally {
      setBusy(false);
    }
  };
  const active = order && (order.status === 'pending' || order.status === 'confirmed' || order.status === 'declined') ? order : null;

  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-checkout">
        {active ? (
          <section className="pub-checkout-done pub-rise" style={rise('0.04s')} aria-label="Order request">
            <p className="pub-kicker">Order request</p>
            <h1 className="pub-title">
              {active.status === 'pending' ? 'Request sent.' : active.status === 'confirmed' ? 'The artist confirmed.' : 'Not this time.'}
            </h1>
            <p className="pub-story">
              {active.status === 'pending'
                ? `${name} will confirm or decline your request for ${work.title} at ₹${active.amount_inr.toLocaleString('en-IN')}. They see your first name and area now, and your full contact details only after they confirm.`
                : active.status === 'confirmed'
                  ? `${name} now has your contact details for ${work.title} at ₹${active.amount_inr.toLocaleString('en-IN')}. They will reach out about the next step. Payments are not connected yet, so nothing was charged.`
                  : `${name} could not take this request. Nothing was charged.`}
            </p>
            {active.status === 'pending' ? (
              <button type="button" className="pub-offer-ghost" disabled={busy} onClick={() => void withdraw()}>
                Withdraw request
              </button>
            ) : null}
            {error ? <p className="pub-offer-error" role="alert">{error}</p> : null}
            <Link className="pub-buy" to={`/artwork/${artworkParam(work)}`}>
              Back to the artwork ↗
            </Link>
          </section>
        ) : (
          <>
            <p className="pub-kicker pub-rise" style={rise('0.06s')}>
              Order request / {work.format}
            </p>
            <h1 className="pub-title pub-rise" style={rise('0.12s')}>
              Ask for this piece.
            </h1>
            <p className="pub-note pub-rise" style={rise('0.18s')}>
              One artwork, one request. The artist confirms before anything else happens.
            </p>
            <p className="pub-note pub-rise pub-checkout-notice" style={rise('0.24s')}>
              Payments are not connected yet. Sending this request charges nothing and does not reserve the piece.
            </p>
            <div className="pub-checkout-body">
              <section className="pub-checkout-summary pub-rise" style={rise('0.3s')} aria-label="Artwork summary">
                {state.photo ? <img src={state.photo} alt={`${work.title} by ${name}`} /> : null}
                <div>
                  <h2 className="pub-checkout-title">{work.title}</h2>
                  <p className="pub-kind">
                    <Link className="pub-inline-link" to={`/artist/${artistParam(artist)}`}>
                      {name}
                    </Link>
                  </p>
                  <p className="pub-kind">
                    {work.format} · {work.medium} · {work.size_class} · {work.width} × {work.height} {work.unit}
                  </p>
                </div>
              </section>
              <section className="pub-checkout-side pub-rise" style={rise('0.38s')} aria-label="How checkout will work">
                <ol className="pub-checkout-steps">
                  <li>
                    <span>01</span>Your details
                  </li>
                  <li>
                    <span>02</span>The artist confirms
                  </li>
                  <li>
                    <span>03</span>You agree the next step
                  </li>
                </ol>
                <p className="pub-checkout-price">
                  <span>{offer ? 'Agreed price' : 'Asking price'}</span>
                  <strong>{money}</strong>
                </p>
                {needsSignIn ? (
                  <p className="pub-note">
                    <Link className="pub-inline-link" to="/account">Sign in</Link> to send an order request.
                  </p>
                ) : (
                  <form className="pub-offer-form" onSubmit={(e) => void send(e)}>
                    <label>
                      Your name
                      <input value={form.name} onChange={set('name')} maxLength={80} required autoComplete="name" disabled={busy} />
                    </label>
                    {physical ? (
                      <>
                        <label>
                          Phone
                          <input value={form.phone} onChange={set('phone')} maxLength={20} required type="tel" autoComplete="tel" disabled={busy} />
                        </label>
                        <label>
                          Delivery address
                          <textarea value={form.address} onChange={set('address')} maxLength={300} rows={3} required autoComplete="street-address" disabled={busy} />
                        </label>
                        <label>
                          PIN code
                          <input value={form.pin} onChange={set('pin')} inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required autoComplete="postal-code" disabled={busy} />
                        </label>
                      </>
                    ) : (
                      <label>
                        Email for the file
                        <input value={form.email} onChange={set('email')} maxLength={120} required type="email" autoComplete="email" disabled={busy} />
                      </label>
                    )}
                    <p className="pub-offer-hint">
                      {physical ? 'The artist sees your first name and area. Phone and address are shared only after they confirm.' : 'The artist sees your first name. Your email is shared only after they confirm.'}
                    </p>
                    {error ? <p className="pub-offer-error" role="alert">{error}</p> : null}
                    <button type="submit" disabled={busy}>
                      {busy ? 'Sending...' : `Send order request at ${money} ↗`}
                    </button>
                  </form>
                )}
                <p className="pub-note">
                  Prefer another price? <Link className="pub-inline-link" to={`/artwork/${artworkParam(work)}`}>Make an offer</Link> on the artwork.
                </p>
              </section>
            </div>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
