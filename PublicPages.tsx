import React, {useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {artEmber, artGlitch, artFigure, artVessel, artContour, artCollage} from './artwork';
import {slugFor} from './publicSlug';
export {slugFor};
import {type SupabaseClient} from '@supabase/supabase-js';
import {
  publicClient,
  loadArtworkBundle,
  loadArtistBundle,
  saveFollow,
  sharedPhotoUrl,
  artworkParam,
  artistParam,
  type ArtworkBundle,
  type ArtistBundle,
  type SharedArtwork,
} from './public-service';
import {
  makeOffer,
  myOfferForArtwork,
  buyerOfferAction,
  signedInUserId,
  type Offer,
} from './offers-service';
import './public-pages.css';

/*
 * Public artwork page + public artist profile + Follow, per the user's
 * voice-note direction: artists keep their own work, share it publicly,
 * collectors can follow artists; buying comes last and is absent here.
 *
 * Two data sources:
 * - REAL: artworks the owner shared publicly and artist profiles load
 *   from the connected project (public-service.ts); Follow is saved to
 *   the account. Shown whenever the URL matches real shared content.
 * - DEMO: the arrays below are the approved dummy preview, used when no
 *   real shared artwork/artist matches. Demo names, prices, bios and
 *   follower counts are illustrative only - not proof of originality or
 *   authenticity - and every demo surface is labeled demo.
 */

type PublicArtist = {
  slug: string;
  name: string;
  discipline: string;
  location: string;
  bio: string;
  followers: number;
};

type PublicWork = {
  slug: string;
  img: string;
  title: string;
  artistSlug: string;
  price: string;
  kind: string;
  story: string;
};

const artists: PublicArtist[] = [
  {
    slug: 'meera-kothari',
    name: 'Meera Kothari',
    discipline: 'Oil painter',
    location: 'Jaipur',
    bio: 'Works in slow layers of oil, chasing the hour when heat lifts off the old city and colour goes quiet.',
    followers: 1284,
  },
  {
    slug: 'kabir-ansal',
    name: 'Kabir Ansal',
    discipline: 'Digital artist',
    location: 'Bengaluru',
    bio: 'Builds glitch studies from corrupted broadcast stills, looking for the moment a signal becomes feeling.',
    followers: 862,
  },
  {
    slug: 'sana-qureshi',
    name: 'Sana Qureshi',
    discipline: 'Charcoal artist',
    location: 'Lucknow',
    bio: 'Draws dancers mid-phrase in compressed charcoal; every line is a single, unerasable decision.',
    followers: 1040,
  },
  {
    slug: 'rohan-iyer',
    name: 'Rohan Iyer',
    discipline: 'Ceramicist',
    location: 'Pondicherry',
    bio: 'Throws quiet stoneware forms and lets one iron-red wash carry the whole kiln.',
    followers: 377,
  },
  {
    slug: 'tara-bhatt',
    name: 'Tara Bhatt',
    discipline: 'Generative artist',
    location: 'Mumbai',
    bio: 'Writes small programs that plot contour fields; prints each run once, then retires the code.',
    followers: 695,
  },
  {
    slug: 'arjun-dev',
    name: 'Arjun Dev',
    discipline: 'Mixed media',
    location: 'New Delhi',
    bio: 'Repairs torn street posters with gold thread, treating the city’s damage as material.',
    followers: 518,
  },
];

const publicWorks: PublicWork[] = [
  {
    slug: 'ember-study-no-4',
    img: artEmber,
    title: 'Ember Study No. 4',
    artistSlug: 'meera-kothari',
    price: '₹18,500',
    kind: 'Physical · Oil on canvas',
    story: 'Part of a series painted in the last light of a Jaipur summer, when the walls hold the day’s heat a little longer than the sky.',
  },
  {
    slug: 'signal-loss',
    img: artGlitch,
    title: 'Signal Loss',
    artistSlug: 'kabir-ansal',
    price: '₹9,200',
    kind: 'Digital · Edition of 10',
    story: 'A single frame of late-night television, pushed through failing compression until the picture gives up being a picture.',
  },
  {
    slug: 'movement-iii',
    img: artFigure,
    title: 'Movement III',
    artistSlug: 'sana-qureshi',
    price: '₹6,800',
    kind: 'Physical · Charcoal on paper',
    story: 'The third drawing in a set of five, made from a two-minute pose the model could only hold once.',
  },
  {
    slug: 'vessel-in-red',
    img: artVessel,
    title: 'Vessel in Red',
    artistSlug: 'rohan-iyer',
    price: '₹14,000',
    kind: 'Physical · Stoneware',
    story: 'A quiet form from the winter firing, finished with a single iron wash that pooled where the wheel slowed.',
  },
  {
    slug: 'contour-field',
    img: artContour,
    title: 'Contour Field',
    artistSlug: 'tara-bhatt',
    price: '₹7,400',
    kind: 'Digital · Generative print',
    story: 'One run of a program that plots elevation lines for a landscape that does not exist. Printed once, code retired.',
  },
  {
    slug: 'mended',
    img: artCollage,
    title: 'Mended',
    artistSlug: 'arjun-dev',
    price: '₹11,300',
    kind: 'Physical · Mixed media',
    story: 'A torn cinema poster from Old Delhi, repaired with gold thread so the damage stays visible.',
  },
];

export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function rise(delay: string): React.CSSProperties {
  return {'--d': delay} as React.CSSProperties;
}

/*
 * LiquidGlassFilter: SVG displacement primitives for the liquid-glass
 * surfaces below - the same feTurbulence + feDisplacementMap approach as
 * the approved account page lens, tuned a little finer. This bends light
 * inside the glass (real distortion), it is not blur-only glass.
 */
function LiquidGlassFilter() {
  return (
    <svg width="0" height="0" className="pub-filter" aria-hidden="true" focusable="false">
      <defs>
        <filter id="pub-liquid-glass" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="11" result="n" />
          <feGaussianBlur in="n" stdDeviation="2" result="m" />
          <feDisplacementMap in="SourceGraphic" in2="m" scale="16" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>
    </svg>
  );
}

/*
 * DottedOrb: a small canvas particle orb, inspired by the user's
 * reference clip of dotted state orbs. Used ONLY for genuine waits
 * (an image that has not finished loading yet) - never as decoration
 * or fake progress. Original hand-rolled implementation, no third-party
 * code.
 */
function DottedOrb({size, label}: {size: number; label: string}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // Fibonacci sphere point cloud.
    const N = 110;
    const pts: Array<[number, number, number]> = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = reduced ? 0 : (now - start) / 1000;
      const rot = t * 0.55;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const R = canvas.width * 0.38;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (const [x0, y0, z0] of pts) {
        const x = x0 * cosR - z0 * sinR;
        const z = x0 * sinR + z0 * cosR;
        const wob = 1 + 0.06 * Math.sin(t * 1.8 + y0 * 3);
        const depth = Math.max(0.25, (z + 1.6) / 2.6);
        ctx.beginPath();
        ctx.arc(cx + x * R * wob, cy + y0 * R * wob, Math.max(0.6, canvas.width * 0.012 * depth), 0, 7);
        ctx.fillStyle = `rgba(208, 213, 171, ${0.22 + 0.6 * depth})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <span className="pub-orb" role="status" aria-label={label}>
      <canvas ref={ref} style={{width: size, height: size}} aria-hidden="true" />
      <span className="pub-orb-label">{label}</span>
    </span>
  );
}

/*
 * LoadingWell: shows the orb while an image is genuinely loading, then
 * fades out once the image is ready (kept mounted ~0.5s for the fade).
 */
function LoadingWell({ready, size, label}: {ready: boolean; size: number; label: string}) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) {
      setGone(false);
      return;
    }
    const id = setTimeout(() => setGone(true), 520);
    return () => clearTimeout(id);
  }, [ready]);
  if (gone) return null;
  return (
    <div className={`pub-art-loading${ready ? ' is-done' : ''}`}>
      <DottedOrb size={size} label={label} />
    </div>
  );
}

function FollowButton({
  followers,
  following,
  onFollow,
  delay,
  demo,
}: {
  followers: number;
  following: boolean;
  onFollow: () => void;
  delay?: string;
  demo?: boolean;
}) {
  const [pop, setPop] = useState(false);
  const [tick, setTick] = useState(0);
  const wasFollowing = useRef(following);
  useEffect(() => {
    if (!wasFollowing.current && following) setPop(true);
    wasFollowing.current = following;
  }, [following]);
  useEffect(() => {
    if (!pop) return;
    const id = setTimeout(() => setPop(false), 780);
    return () => clearTimeout(id);
  }, [pop]);
  return (
    <div className="pub-follow-row pub-rise" style={rise(delay ?? '0s')}>
      <button
        type="button"
        className={`pub-follow${following ? ' is-following' : ''}${pop ? ' just-followed' : ''}`}
        aria-pressed={following}
        onClick={() => {
          onFollow();
          setTick((t) => t + 1);
        }}
      >
        {following ? 'Following ✓' : 'Follow'}
      </button>
      <span className="pub-follow-count">
        <span key={tick} className="pub-count-num">
          {followers.toLocaleString('en-IN')}
        </span>{' '}
        {followers === 1 ? 'follower' : 'followers'} {demo ? <em>demo</em> : null}
      </span>
    </div>
  );
}

/* Demo pages keep their illustrative, in-memory Follow. */
function DemoFollow({followers, delay}: {followers: number; delay?: string}) {
  const [following, setFollowing] = useState(false);
  return (
    <FollowButton
      followers={followers + (following ? 1 : 0)}
      following={following}
      onFollow={() => setFollowing((f) => !f)}
      delay={delay}
      demo
    />
  );
}

/*
 * RealFollow: persisted Follow on a real shared artist. Optimistic toggle
 * with rollback when the save fails; sign-in is required to follow.
 */
function RealFollow({
  client,
  artistId,
  initialFollowers,
  initialFollowing,
  delay,
}: {
  client: SupabaseClient;
  artistId: string;
  initialFollowers: number;
  initialFollowing: boolean;
  delay?: string;
}) {
  const [followers, setFollowers] = useState(initialFollowers);
  const [following, setFollowing] = useState(initialFollowing);
  const [error, setError] = useState('');
  const toggle = () => {
    const next = !following;
    setFollowing(next);
    setFollowers((c) => c + (next ? 1 : -1));
    setError('');
    saveFollow(client, artistId, next).catch((e) => {
      setFollowing(!next);
      setFollowers((c) => c + (next ? -1 : 1));
      setError(e instanceof Error ? e.message : 'Could not save that. Try again.');
    });
  };
  return (
    <>
      <FollowButton followers={followers} following={following} onFollow={toggle} delay={delay} />
      {error === 'Sign in to follow artists.' ? (
        <p className="pub-note pub-rise">
          Sign in to follow artists. <Link to="/account">Go to sign in ↗</Link>
        </p>
      ) : error ? (
        <p className="pub-note pub-rise">{error}</p>
      ) : null}
    </>
  );
}

export function PublicHeader() {
  return (
    <header className="pub-top">
      <LiquidGlassFilter />
      <Link to="/gallery" className="pub-wordmark pub-rise">
        elusive<i>·</i>hue
      </Link>
      <Link to="/gallery" className="pub-back pub-rise" style={rise('0.06s')}>
        Back to the gallery
      </Link>
    </header>
  );
}

export function PublicFooter({demo}: {demo?: boolean}) {
  return (
    <footer className="pub-foot pub-rise" style={rise('0.68s')}>
      {demo
        ? 'Demo preview only. Artwork, artist, price and followers are dummy content. Nothing is for sale.'
        : 'Shared by the artist. Follows and offers are saved to accounts. Once the artist confirms an order, you pay them directly.'}
    </footer>
  );
}

/* Loading shell while a real lookup is in flight. */
export function PublicLoading({label}: {label: string}) {
  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-art">
        <LoadingWell ready={false} size={64} label={label} />
      </main>
    </div>
  );
}

export function ArtworkPage() {
  const {slug = ''} = useParams<{slug: string}>();
  const client = publicClient();
  const [state, setState] = useState<{bundle: ArtworkBundle | null; photo: string; checked: boolean}>({
    bundle: null,
    photo: '',
    checked: !client,
  });

  useEffect(() => {
    setState({bundle: null, photo: '', checked: !client});
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

  if (!state.checked) return <PublicLoading label="Opening the artwork" />;
  if (state.bundle && client) return <RealArtwork key={state.bundle.work.id} bundle={state.bundle} photo={state.photo} client={client} />;
  return <DemoArtwork slug={slug} />;
}


/* Buyer side of a listed artwork: direct checkout entry + a real,
 * persisted make-an-offer conversation. An offer asks the artist for a
 * different price; it is not a purchase and never charges anything. */
function BuyOffer({client, work}: {client: SupabaseClient; work: SharedArtwork}) {
  const [me, setMe] = useState<string | null | undefined>(undefined);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    signedInUserId(client)
      .then(async (id) => {
        if (!live) return;
        setMe(id);
        if (id) {
          try {
            const current = await myOfferForArtwork(client, work.id);
            if (live) setOffer(current);
          } catch { /* the offer area still works; status just stays unknown */ }
        }
      })
      .catch(() => { if (live) setMe(null); });
    return () => { live = false; };
  }, [client, work.id]);

  const money = (v: number) => '₹' + v.toLocaleString('en-IN');
  const run = (fn: () => Promise<Offer>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    fn()
      .then((next) => { setOffer(next); setAmount(''); setNote(''); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not update the offer. Retry when connected.'))
      .finally(() => setBusy(false));
  };
  const valid = (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 10000000;
  const submit = () => {
    if (!valid(amount)) { setError('Enter a whole-rupee amount between ₹1 and ₹1,00,00,000.'); return; }
    // A countered offer is revised in place; a fresh insert would break the
    // one-open-offer-per-artwork rule.
    if (offer && offer.status === 'countered') {
      run(() => buyerOfferAction(client, offer.id, 'revise', Number(amount), note));
      return;
    }
    run(() => makeOffer(client, work.id, Number(amount), note));
  };

  const openForm = (
    <form className="pub-offer-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label>Your offer · INR<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={8} placeholder="Your price in rupees" disabled={busy} /></label>
      <label>Note to the artist · optional<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Add a short note" disabled={busy} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send offer ↗'}</button>
    </form>
  );

  let offerArea: React.ReactNode;
  if (me === undefined) {
    offerArea = <p className="pub-note">Checking your account...</p>;
  } else if (me === null) {
    offerArea = <p className="pub-note"><Link to="/account" className="pub-inline-link">Sign in</Link> to make an offer. An offer asks the artist for a different price; it is not a purchase.</p>;
  } else if (me === work.owner_id) {
    offerArea = <p className="pub-note">This is your artwork. Offers from buyers appear in My artworks.</p>;
  } else if (!offer || offer.status === 'withdrawn') {
    offerArea = openForm;
  } else if (offer.status === 'declined') {
    offerArea = <>
      <p className="pub-note">The artist declined your offer of {money(offer.amount_inr)}. You can send a new one.</p>
      {openForm}
    </>;
  } else if (offer.status === 'pending') {
    offerArea = <div className="pub-offer-state">
      <p><strong>{money(offer.amount_inr)}</strong> offered · waiting for the artist.</p>
      <button type="button" disabled={busy} onClick={() => run(() => buyerOfferAction(client, offer.id, 'withdraw'))}>Withdraw offer</button>
    </div>;
  } else if (offer.status === 'countered') {
    offerArea = <div className="pub-offer-state">
      <p>You offered {money(offer.amount_inr)} · the artist countered at <strong>{money(offer.counter_amount_inr ?? 0)}</strong>.</p>
      <div className="pub-offer-actions">
        <button type="button" disabled={busy} onClick={() => run(() => buyerOfferAction(client, offer.id, 'accept_counter'))}>Accept {money(offer.counter_amount_inr ?? 0)} ↗</button>
        <button type="button" disabled={busy} onClick={() => run(() => buyerOfferAction(client, offer.id, 'withdraw'))}>Withdraw</button>
      </div>
      <p className="pub-note">Or send a different price below.</p>
      {openForm}
    </div>;
  } else {
    offerArea = <div className="pub-offer-state">
      <p><strong>Agreed at {money(offer.amount_inr)}.</strong></p>
      <p className="pub-note">Nothing is charged or reserved here. The artist can see this agreement.</p>
      <Link className="pub-buy" to={`/buy/${artworkParam(work)}`}>Send order request at {money(offer.amount_inr)} ↗</Link>
    </div>;
  }

  return <section className="pub-offer pub-rise" style={rise('0.4s')} aria-label="Buy or make an offer">
    <div className="pub-offer-top">
      <Link className="pub-buy" to={`/buy/${artworkParam(work)}`}>Buy at {money(work.asking_price_inr)} ↗</Link>
      <span className="pub-offer-hint">or make an offer</span>
    </div>
    {offerArea}
    {error && <p className="pub-offer-error" role="alert">{error}</p>}
  </section>;
}

/* Real shared artwork: data from the connected project, photo via a
 * signed URL of the same stored file (no duplicate copy). */
function RealArtwork({bundle, photo, client}: {bundle: ArtworkBundle; photo: string; client: SupabaseClient}) {
  const {work, artist} = bundle;
  const name = artist.display_name || (artist.username ? '@' + artist.username : 'Artist');
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgReady(true);
  }, [photo]);

  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-art">
        <figure className="pub-art-figure pub-rise" style={rise('0.02s')}>
          <LoadingWell ready={imgReady && Boolean(photo)} size={64} label="Opening the artwork" />
          {photo ? (
            <img
              ref={imgRef}
              src={photo}
              alt={`${work.title} by ${name}`}
              onLoad={() => setImgReady(true)}
              className={imgReady ? 'is-ready' : ''}
            />
          ) : null}
        </figure>
        <section className="pub-art-info">
          <p className="pub-kicker pub-rise" style={rise('0.12s')}>
            Public artwork
          </p>
          <h1 className="pub-title pub-rise" style={rise('0.18s')}>
            {work.title}
          </h1>
          <p className="pub-kind pub-rise" style={rise('0.24s')}>
            {work.format} · {work.medium}
          </p>
          <p className="pub-kind pub-rise" style={rise('0.28s')}>
            {work.size_class} · {work.width} × {work.height} {work.unit}
          </p>
          <p className="pub-price pub-rise" style={rise('0.32s')}>
            ₹{work.asking_price_inr.toLocaleString('en-IN')}
            <span className="pub-price-note">asking price</span>
          </p>
          {work.description ? (
            <p className="pub-story pub-rise" style={rise('0.38s')}>
              {work.description}
            </p>
          ) : null}
          {work.for_sale ? (
            <BuyOffer client={client} work={work} />
          ) : (
            <p className="pub-note pub-rise" style={rise('0.44s')}>
              Not offered for sale. This is the artwork {name.split(' ')[0]} chose to share.
            </p>
          )}
          <Link to={`/artist/${artistParam(artist)}`} className="pub-artist-card pub-rise" style={rise('0.5s')}>
            <span className="pub-card-refract" aria-hidden="true" />
            <span className="pub-avatar" aria-hidden="true">
              {initials(name)}
            </span>
            <span className="pub-artist-meta">
              <strong>{name}</strong>
              <small>{artist.username ? '@' + artist.username : 'Shared artist'}</small>
            </span>
            <span className="pub-artist-open">View artist ↗</span>
          </Link>
          <RealFollow
            key={artist.id}
            client={client}
            artistId={artist.id}
            initialFollowers={bundle.followers}
            initialFollowing={bundle.following}
            delay="0.58s"
          />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

/* Demo artwork page: the approved dummy preview, unchanged. */
function DemoArtwork({slug}: {slug: string}) {
  const work = publicWorks.find((w) => w.slug === slug) ?? publicWorks[0];
  const artist = artists.find((a) => a.slug === work.artistSlug) ?? artists[0];
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgReady(false);
  }, [slug]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImgReady(true);
  }, [slug]);

  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-art">
        <figure className="pub-art-figure pub-rise" style={rise('0.02s')}>
          <LoadingWell ready={imgReady} size={64} label="Opening the artwork" />
          <img
            ref={imgRef}
            src={work.img}
            alt={`${work.title} by ${artist.name}`}
            onLoad={() => setImgReady(true)}
            className={imgReady ? 'is-ready' : ''}
          />
        </figure>
        <section className="pub-art-info">
          <p className="pub-kicker pub-rise" style={rise('0.12s')}>
            Public artwork · demo
          </p>
          <h1 className="pub-title pub-rise" style={rise('0.18s')}>
            {work.title}
          </h1>
          <p className="pub-kind pub-rise" style={rise('0.24s')}>
            {work.kind}
          </p>
          <p className="pub-price pub-rise" style={rise('0.32s')}>
            {work.price}
            <span className="pub-price-note">illustrative</span>
          </p>
          <p className="pub-story pub-rise" style={rise('0.38s')}>
            {work.story}
          </p>
          <p className="pub-note pub-rise" style={rise('0.44s')}>
            Buying is not live yet. This page previews how a shared artwork will look.
          </p>
          <Link to={`/artist/${artist.slug}`} className="pub-artist-card pub-rise" style={rise('0.5s')}>
            <span className="pub-card-refract" aria-hidden="true" />
            <span className="pub-avatar" aria-hidden="true">
              {initials(artist.name)}
            </span>
            <span className="pub-artist-meta">
              <strong>{artist.name}</strong>
              <small>
                {artist.discipline} · {artist.location}
              </small>
            </span>
            <span className="pub-artist-open">View artist ↗</span>
          </Link>
          <DemoFollow followers={artist.followers} delay="0.58s" />
        </section>
      </main>
      <PublicFooter demo />
    </div>
  );
}

function WorkCard({to, img, title, kind, price, delay}: {to: string; img: string; title: string; kind: string; price: string; delay?: string}) {
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
  }, []);
  return (
    <Link to={to} className="pub-work-card pub-rise" style={rise(delay ?? '0s')}>
      <div className="pub-work-thumb">
        <LoadingWell ready={ready} size={40} label="Loading" />
        <img ref={imgRef} src={img} alt={title} loading="lazy" onLoad={() => setReady(true)} className={ready ? 'is-ready' : ''} />
      </div>
      <span className="pub-work-meta">
        <strong>{title}</strong>
        <small>{kind}</small>
      </span>
      <span className="pub-work-price">{price}</span>
    </Link>
  );
}

function RealWorkCard({work, url, delay}: {work: SharedArtwork; url: string; delay?: string}) {
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
  }, [url]);
  return (
    <Link to={`/artwork/${artworkParam(work)}`} className="pub-work-card pub-rise" style={rise(delay ?? '0s')}>
      <div className="pub-work-thumb">
        <LoadingWell ready={ready && Boolean(url)} size={40} label="Loading" />
        {url ? (
          <img ref={imgRef} src={url} alt={work.title} loading="lazy" onLoad={() => setReady(true)} className={ready ? 'is-ready' : ''} />
        ) : null}
      </div>
      <span className="pub-work-meta">
        <strong>{work.title}</strong>
        <small>
          {work.format} · {work.medium}
        </small>
      </span>
      <span className="pub-work-price">₹{work.asking_price_inr.toLocaleString('en-IN')}</span>
    </Link>
  );
}

export function ArtistPage() {
  const {slug = ''} = useParams<{slug: string}>();
  const client = publicClient();
  const [state, setState] = useState<{bundle: ArtistBundle | null; photos: Record<string, string>; checked: boolean}>({
    bundle: null,
    photos: {},
    checked: !client,
  });

  useEffect(() => {
    setState({bundle: null, photos: {}, checked: !client});
    window.scrollTo(0, 0);
    if (!client) return;
    let live = true;
    loadArtistBundle(client, slug)
      .then(async (bundle) => {
        const photos: Record<string, string> = {};
        if (bundle) {
          await Promise.all(
            bundle.works.map(async (w) => {
              try {
                photos[w.id] = await sharedPhotoUrl(client, w.image_path);
              } catch {
                /* photo stays blank; card still links through */
              }
            }),
          );
        }
        if (live) setState({bundle, photos, checked: true});
      })
      .catch(() => {
        if (live) setState({bundle: null, photos: {}, checked: true});
      });
    return () => {
      live = false;
    };
  }, [slug]);

  if (!state.checked) return <PublicLoading label="Opening the artist" />;
  if (state.bundle && client) return <RealArtist key={state.bundle.profile.id} bundle={state.bundle} photos={state.photos} client={client} />;
  return <DemoArtist slug={slug} />;
}

/* Real public artist profile: shown only while the artist has shared work. */
function RealArtist({bundle, photos, client}: {bundle: ArtistBundle; photos: Record<string, string>; client: SupabaseClient}) {
  const {profile, works} = bundle;
  const name = profile.display_name || (profile.username ? '@' + profile.username : 'Artist');
  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-profile-space">
        <header className="pub-profile">
          <span className="pub-avatar pub-avatar-lg pub-rise" style={rise('0.05s')} aria-hidden="true">
            {initials(name)}
          </span>
          <div className="pub-profile-main">
            <p className="pub-kicker pub-rise" style={rise('0.1s')}>
              Artist · public profile
            </p>
            <h1 className="pub-title pub-rise" style={rise('0.16s')}>
              {name}
            </h1>
            {profile.username ? (
              <p className="pub-kind pub-rise" style={rise('0.22s')}>
                @{profile.username}
              </p>
            ) : null}
            {profile.bio ? (
              <p className="pub-bio pub-rise" style={rise('0.28s')}>
                {profile.bio}
              </p>
            ) : null}
          </div>
          <div className="pub-profile-side">
            <RealFollow
              key={profile.id}
              client={client}
              artistId={profile.id}
              initialFollowers={bundle.followers}
              initialFollowing={bundle.following}
              delay="0.34s"
            />
            <p className="pub-follow-note pub-rise" style={rise('0.4s')}>
              Followers show popularity, not proof of originality.
            </p>
          </div>
        </header>
        <section className="pub-works">
          <div className="pub-works-head pub-rise" style={rise('0.44s')}>
            <h2 className="pub-works-title">Shared works</h2>
            <span className="pub-works-count">
              {works.length} {works.length === 1 ? 'piece' : 'pieces'}
            </span>
          </div>
          {works.length > 0 ? (
            <div className="pub-grid">
              {works.map((w, i) => (
                <RealWorkCard key={w.id} work={w} url={photos[w.id] ?? ''} delay={`${(0.5 + i * 0.07).toFixed(2)}s`} />
              ))}
            </div>
          ) : (
            <p className="pub-note pub-rise" style={rise('0.5s')}>
              Nothing shared yet. Works will appear here as {name.split(' ')[0]} shares them.
            </p>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

/* Demo artist page: the approved dummy preview, unchanged. */
function DemoArtist({slug}: {slug: string}) {
  const artist = artists.find((a) => a.slug === slug) ?? artists[0];
  const works = publicWorks.filter((w) => w.artistSlug === artist.slug);

  return (
    <div className="pub-space">
      <PublicHeader />
      <main className="pub-profile-space">
        <header className="pub-profile">
          <span className="pub-avatar pub-avatar-lg pub-rise" style={rise('0.05s')} aria-hidden="true">
            {initials(artist.name)}
          </span>
          <div className="pub-profile-main">
            <p className="pub-kicker pub-rise" style={rise('0.1s')}>
              Artist · public profile · demo
            </p>
            <h1 className="pub-title pub-rise" style={rise('0.16s')}>
              {artist.name}
            </h1>
            <p className="pub-kind pub-rise" style={rise('0.22s')}>
              {artist.discipline} · {artist.location}
            </p>
            <p className="pub-bio pub-rise" style={rise('0.28s')}>
              {artist.bio}
            </p>
          </div>
          <div className="pub-profile-side">
            <DemoFollow followers={artist.followers} delay="0.34s" />
            <p className="pub-follow-note pub-rise" style={rise('0.4s')}>
              Followers show popularity, not proof of originality.
            </p>
          </div>
        </header>
        <section className="pub-works">
          <div className="pub-works-head pub-rise" style={rise('0.44s')}>
            <h2 className="pub-works-title">Shared works</h2>
            <span className="pub-works-count">
              {works.length} {works.length === 1 ? 'piece' : 'pieces'} · demo
            </span>
          </div>
          {works.length > 0 ? (
            <div className="pub-grid">
              {works.map((w, i) => (
                <WorkCard
                  key={w.slug}
                  to={`/artwork/${w.slug}`}
                  img={w.img}
                  title={w.title}
                  kind={w.kind}
                  price={w.price}
                  delay={`${(0.5 + i * 0.07).toFixed(2)}s`}
                />
              ))}
            </div>
          ) : (
            <p className="pub-note pub-rise" style={rise('0.5s')}>
              Nothing shared yet. Works will appear here as {artist.name.split(' ')[0]} shares them.
            </p>
          )}
        </section>
      </main>
      <PublicFooter demo />
    </div>
  );
}
