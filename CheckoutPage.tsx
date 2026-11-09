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
import {PublicFooter, PublicHeader, PublicLoading, rise} from './PublicPages';
import './public-pages.css';

/*
 * Direct checkout for one listed artwork. Payments are deliberately not
 * connected: confirming ends at an honest "nothing was charged" state,
 * same idiom as the order-history preview. No order, reservation or
 * payment is created anywhere.
 */
export function CheckoutPage() {
  const {slug = ''} = useParams<{slug: string}>();
  const client = publicClient();
  const [state, setState] = useState<{bundle: ArtworkBundle | null; photo: string; checked: boolean}>({
    bundle: null,
    photo: '',
    checked: !client,
  });
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    setState({bundle: null, photo: '', checked: !client});
    setPlaced(false);
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
  const money = '₹' + work.asking_price_inr.toLocaleString('en-IN');

  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-checkout">
        {placed ? (
          <section className="pub-checkout-done pub-rise" style={rise('0.04s')} aria-label="Preview complete">
            <p className="pub-kicker">Preview complete</p>
            <h1 className="pub-title">Nothing was charged.</h1>
            <p className="pub-story">
              When payments arrive, this step collects them. For now no order, reservation or payment exists, and the
              listing stays exactly as it was.
            </p>
            <Link className="pub-buy" to={`/artwork/${artworkParam(work)}`}>
              Back to the artwork ↗
            </Link>
          </section>
        ) : (
          <>
            <p className="pub-kicker pub-rise" style={rise('0.06s')}>
              Checkout / {work.format}
            </p>
            <h1 className="pub-title pub-rise" style={rise('0.12s')}>
              Almost home.
            </h1>
            <p className="pub-note pub-rise" style={rise('0.18s')}>
              One artwork, straight to payment. No cart to manage.
            </p>
            <p className="pub-note pub-rise pub-checkout-notice" style={rise('0.24s')}>
              Checkout preview. Payments are not connected yet: confirming charges nothing, reserves nothing and creates
              no order.
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
                    <span>02</span>Payment
                  </li>
                  <li>
                    <span>03</span>The piece is yours
                  </li>
                </ol>
                <p className="pub-checkout-price">
                  <span>Artwork price</span>
                  <strong>{money}</strong>
                </p>
                <button type="button" className="pub-buy" onClick={() => setPlaced(true)}>
                  Confirm order · preview ↗
                </button>
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
