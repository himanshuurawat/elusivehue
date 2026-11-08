import React, {useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {artEmber, artGlitch, artFigure, artVessel, artContour, artCollage} from './artwork';
import {slugFor} from './publicSlug';
export {slugFor};
import './public-pages.css';

/*
 * DEMO PREVIEW ONLY (not committed, not deployed).
 * Public artwork page + public artist profile + Follow, per the user's
 * voice-note direction: artists keep their own work, share it publicly,
 * collectors can follow artists; buying comes last and is absent here.
 * Every name, artwork, price, bio and follower count below is dummy
 * content. Follower counts are illustrative popularity numbers only —
 * they are not proof of originality or authenticity.
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function rise(delay: string): React.CSSProperties {
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

function FollowButton({followers, delay}: {followers: number; delay?: string}) {
  const [following, setFollowing] = useState(false);
  const [pop, setPop] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!pop) return;
    const id = setTimeout(() => setPop(false), 780);
    return () => clearTimeout(id);
  }, [pop]);
  const count = followers + (following ? 1 : 0);
  return (
    <div className="pub-follow-row pub-rise" style={rise(delay ?? '0s')}>
      <button
        type="button"
        className={`pub-follow${following ? ' is-following' : ''}${pop ? ' just-followed' : ''}`}
        aria-pressed={following}
        onClick={() => {
          const next = !following;
          setFollowing(next);
          if (next) setPop(true);
          setTick((t) => t + 1);
        }}
      >
        {following ? 'Following ✓' : 'Follow'}
      </button>
      <span className="pub-follow-count">
        <span key={tick} className="pub-count-num">
          {count.toLocaleString('en-IN')}
        </span>{' '}
        followers <em>demo</em>
      </span>
    </div>
  );
}

function PublicHeader() {
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

function PublicFooter() {
  return (
    <footer className="pub-foot pub-rise" style={rise('0.68s')}>
      Demo preview only. Artwork, artist, price and followers are dummy content. Nothing is for sale.
    </footer>
  );
}

export function ArtworkPage() {
  const {slug} = useParams<{slug: string}>();
  const work = publicWorks.find((w) => w.slug === slug) ?? publicWorks[0];
  const artist = artists.find((a) => a.slug === work.artistSlug) ?? artists[0];
  const [imgReady, setImgReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgReady(false);
    window.scrollTo(0, 0);
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
          <FollowButton followers={artist.followers} delay="0.58s" />
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function WorkCard({work, delay}: {work: PublicWork; delay?: string}) {
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setReady(true);
  }, []);
  return (
    <Link to={`/artwork/${work.slug}`} className="pub-work-card pub-rise" style={rise(delay ?? '0s')}>
      <div className="pub-work-thumb">
        <LoadingWell ready={ready} size={40} label="Loading" />
        <img
          ref={imgRef}
          src={work.img}
          alt={work.title}
          loading="lazy"
          onLoad={() => setReady(true)}
          className={ready ? 'is-ready' : ''}
        />
      </div>
      <span className="pub-work-meta">
        <strong>{work.title}</strong>
        <small>{work.kind}</small>
      </span>
      <span className="pub-work-price">{work.price}</span>
    </Link>
  );
}

export function ArtistPage() {
  const {slug} = useParams<{slug: string}>();
  const artist = artists.find((a) => a.slug === slug) ?? artists[0];
  const works = publicWorks.filter((w) => w.artistSlug === artist.slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

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
            <FollowButton followers={artist.followers} delay="0.34s" />
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
                <WorkCard key={w.slug} work={w} delay={`${(0.5 + i * 0.07).toFixed(2)}s`} />
              ))}
            </div>
          ) : (
            <p className="pub-note pub-rise" style={rise('0.5s')}>
              Nothing shared yet. Works will appear here as {artist.name.split(' ')[0]} shares them.
            </p>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
