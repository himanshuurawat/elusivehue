import React, {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import '@google/model-viewer';
import {RESALE_ITEMS} from './resale-items';
import './resale-view.css';

/*
 * Resale item detail view. Dummy shelf data only - no real listings, orders
 * or payments. 3D follows the approved direction: a listing shows the
 * seller's own 3D model when one exists, photos otherwise. The sample model
 * here loads on demand (1.3 MB) with the photo as poster and fallback, and
 * auto-rotate is skipped under prefers-reduced-motion.
 */

export function ResaleItemPage() {
  const {slug} = useParams<{slug: string}>();
  const item = RESALE_ITEMS.find(i => i.slug === slug);
  const [load3d, setLoad3d] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!item) {
    return <main className="rv-page">
      <header className="rv-nav"><Link to="/" className="rv-wordmark">elusive<i>·</i>hue</Link></header>
      <section className="rv-missing"><p>This shelf item is not here any more.</p><Link to="/">Back to the shelf ↗</Link></section>
    </main>;
  }

  return <main className="rv-page">
    <header className="rv-nav">
      <Link to="/" className="rv-wordmark">elusive<i>·</i>hue</Link>
      <Link to="/" className="rv-back">Back to the shelf ↗</Link>
    </header>
    <section className="rv-stage">
      <div className="rv-media rv-rise">
        {item.model && load3d ? (
          <>
          <model-viewer
            src={item.model}
            poster={item.img}
            alt={`Sample 3D model for ${item.title}`}
            camera-controls
            touch-action="pan-y"
            interaction-prompt="auto"
            shadow-intensity="1"
            environment-image="neutral"
            {...(reduced ? {} : {'auto-rotate': '', 'rotation-per-second': '28deg'})}
          />
          <button type="button" className="rv-photo-btn" onClick={() => setLoad3d(false)}>Back to photo</button>
          </>
        ) : (
          <>
            <img src={item.img} alt={item.title} />
            {item.model && (
              <button type="button" className="rv-3d-btn" onClick={() => setLoad3d(true)}>
                View in 3D <span>1.3 MB sample, loads on demand</span>
              </button>
            )}
          </>
        )}
        <span className="cond">{item.kind}</span>
      </div>
      <div className="rv-info rv-rise" style={{animationDelay: '0.12s'}}>
        <p className="rv-kicker">The second-hand shelf</p>
        <h1 className="display">{item.title}</h1>
        <p className="rv-price">{item.price}</p>
        <p className="rv-line">Listed by {item.seller}</p>
        <p className="rv-blurb">{item.blurb}</p>
        {item.model && <p className="rv-note">The 3D view is a sample model (Khronos Antique Camera, CC0 - stand-in shape, not this exact camera). A real listing would show the seller's own model, or photos like above when there is none.</p>}
        <p className="rv-note">Demo listing for layout only - this item is not really for sale and ordering is not available.</p>
      </div>
    </section>
    <footer className="rv-foot"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
