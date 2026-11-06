import {heroWide,artEmber,artGlitch,artFigure,artVessel,artContour,artCollage,resaleCamera,resaleBrushes,resaleJacket} from './artwork';
import React, { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';



















const DOT = '\u00B7';
const RU = '\u20B9';


const works = [
    { img: artEmber, title: 'Ember Study No. 4', artist: 'Meera Kothari', price: `${RU}18,500`, kind: `Physical ${DOT} Oil on canvas` },
    { img: artGlitch, title: 'Signal Loss', artist: 'Kabir Ansal', price: `${RU}9,200`, kind: `Digital ${DOT} Edition of 10` },
    { img: artFigure, title: 'Movement III', artist: 'Sana Qureshi', price: `${RU}6,800`, kind: `Physical ${DOT} Charcoal on paper` },
    { img: artVessel, title: 'Vessel in Red', artist: 'Rohan Iyer', price: `${RU}14,000`, kind: `Physical ${DOT} Stoneware` },
    { img: artContour, title: 'Contour Field', artist: 'Tara Bhatt', price: `${RU}7,400`, kind: `Digital ${DOT} Generative print` },
    { img: artCollage, title: 'Mended', artist: 'Arjun Dev', price: `${RU}11,300`, kind: `Physical ${DOT} Mixed media` },
];

const resale = [
    { img: resaleCamera, title: 'Volt 35mm SLR', seller: 'Aarav S. · Jaipur', price: `${RU}7,999`, kind: `Camera ${DOT} Good condition` },
    { img: resaleBrushes, title: 'Studio brush set of 12', seller: 'Priya M. · Pune', price: `${RU}850`, kind: `Art supplies ${DOT} Used` },
    { img: resaleJacket, title: 'Black denim jacket, M', seller: 'Dev R. · Delhi', price: `${RU}1,600`, kind: `Clothing ${DOT} Worn in` },
];

function ResaleShelf() {
    return <section className="r-sec">
        <div className="head">
            <h2 className="display rise">The second-hand shelf</h2>
            <span className="meta">Separate from the art</span>
        </div>
        <p className="note rise">Separate from the art: the plan is that anyone can also list personal belongings here: gear, supplies, clothes, collectibles. Items, sellers and prices shown are dummy data for layout only.</p>
        <div className="r-grid">
            {resale.map((r, i) => (
                <a className="r-card rise" style={{ animationDelay: `${0.15 + i * 0.1}s` }} key={r.title} href="#" onClick={(e) => e.preventDefault()}>
                    <div className="ph">
                        <img src={r.img} alt={r.title} />
                        <span className="cond">{r.kind}</span>
                    </div>
                    <div className="row"><span className="t">{r.title}</span><span className="p">{r.price}</span></div>
                    <div className="a">Listed by {r.seller}</div>
                </a>
            ))}
        </div>
    </section>;
}

function Wordmark() {
    return <span className="wordmark">elusive<i>{DOT}</i>hue</span>;
}

function Pill({ look, alt, onToggle }: { look: string; alt?: boolean; onToggle?: () => void }) {
    return <nav className="pillnav" aria-label="Demo pages">
        <Link to="/">{'\u2039'} Looks</Link>
        <Wordmark />
        <span className="looktag">{look}</span>
        {onToggle ? <button type="button" className="themebtn" onClick={onToggle} aria-pressed={alt}>{alt ? 'Dark' : 'Light'}</button> : null}
    </nav>;
}

function Foot({ note }: { note: string }) {
    return <footer className="g-foot">
        <span className="demotag">Visual demo</span>
        <p className="meta" style={{ margin: 0, maxWidth: '52ch' }}>{note} Artworks, artists and prices are dummy data for layout only. Nothing here is for sale. Elusive Hue is the selected project name. This demo does not confirm trademark or domain rights.</p>
        <Link className="meta" to="/" style={{ textDecoration: 'none' }}>{'\u2039'} Back to the three looks</Link>
    </footer>;
}

/* ---------------- Chooser ---------------- */

function Chooser({ still = false }: { still?: boolean }) {
    return <div className={`stage${still ? ' still' : ''}`}>
        <div className="grain" />
        <Pill look="Pick one" />
        <div className="choose">
            <p className="kicker rise d1">Art marketplace {DOT} storefront concepts</p>
            <h1 className="display rise d2">Three looks.<span className="l2">One is yours.</span></h1>
            <p className="intro rise d3">Same idea, three different moods: a quiet gallery, a light spatial poster and an experimental collage. Artwork, layout and movement lead; colour stays in the background. Open each, scroll it on your phone, and tell me which direction feels right. Every look also carries a light/dark theme switch in the top bar and a second-hand shelf below the art, since people will sell personal belongings too.</p>
            <Link className="lookrow rise d3" to="/gallery">
                <span className="num">01</span>
                <span className="name">Midnight Gallery</span>
                <span className="go">Open {'\u2192'}</span>
                <span className="vibe">A quiet dark gallery. Scroll through a layered art scene: background, artwork and type move at different speeds.</span>
            </Link>
            <Link className="lookrow rise d4" to="/poster">
                <span className="num">02</span>
                <span className="name">Kinetic Poster</span>
                <span className="go">Open {'\u2192'}</span>
                <span className="vibe">Type and artwork share the stage. Layered pieces, floating labels and quiet movement on a neutral canvas.</span>
            </Link>
            <Link className="lookrow rise d5" to="/signal">
                <span className="num">03</span>
                <span className="name">Raw Signal</span>
                <span className="go">Open {'\u2192'}</span>
                <span className="vibe">Street energy. Glitching headline, a running ticker, an offset collage grid with a red-channel echo when you touch a piece.</span>
            </Link>
            <div className="foot rise d6">
                <span className="demotag">Visual demo</span>
                <p className="meta" style={{ margin: 0 }}>All artworks, artists and prices are dummy data for layout only. These are original directions, not copies of any reference.</p>
            </div>
        </div>
    </div>;
}

/* ---------------- Look 1: Midnight Gallery ---------------- */

function DepthScene() {
    return <div className="depth-scroll" tabIndex={0} role="region" aria-label="Layered art scene. Scroll here to explore depth." onScroll={e => { const el=e.currentTarget; el.style.setProperty('--depth', String(Math.min(1, el.scrollTop / 620))); }}>
        <div className="depth-track">
            <div className="depth-scene">
                <div className="depth-bg"><img src={heroWide} alt="A quiet abstract landscape of paint" /></div>
                <div className="depth-halo" />
                <div className="depth-title"><span className="kicker">An independent point of view</span><h2>Art has<br /><i>another layer.</i></h2></div>
                <div className="depth-mid"><img src={artFigure} alt="Charcoal figure on the middle plane" /><span>Study in movement / Physical</span></div>
                <div className="depth-front"><img src={artCollage} alt="Paper collage on the foreground plane" /><span>Objects with a story</span></div>
                <span className="depth-hint">Scroll inside the scene <b>↓</b></span>
                <span className="depth-outro">A closer look.<br /><small>Different planes. One collection.</small></span>
            </div>
        </div>
    </div>;
}

function Gallery({ still = false }: { still?: boolean }) {
    const [alt, setAlt] = useState(false);
    return <div className={`stage gallery${still ? ' still' : ''}${alt ? ' alt' : ''}`}>
        <div className="grain" />
        <Pill look="Look 1 / 3" alt={alt} onToggle={() => setAlt(!alt)} />
        <header className="g-hero">
            <span className="vert rise d3">Original works only {DOT} est. soon</span>
            <p className="kicker rise d1">A marketplace for artists</p>
            <h1 className="display rise d2">Own the<br /><span className="red">original.</span></h1>
            <div className="hero-line" />
            <div className="g-hero-art">
                <svg className="frame-draw" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="0.75" y="0.75" width="98.5" height="98.5" pathLength={400} strokeDasharray={400} strokeDashoffset={still ? 0 : 400}>
                        {still ? null : <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2.2s" begin="0.6s" fill="freeze" />}
                    </rect>
                </svg>
                <DepthScene />
                <div className="cap rise d4">
                    <span className="meta">A moving collection {DOT} Six perspectives</span>
                    <span className="meta" style={{ color: 'var(--ink)' }}>Explore the collection</span>
                </div>
            </div>
        </header>
        <section className="g-section">
            <div className="head">
                <h2 className="display rise">New this week</h2>
                <span className="meta">6 pieces {DOT} physical + digital</span>
            </div>
            <div className="g-works">
                {works.map((w, i) => (
                    <a className="g-card rise" style={{ animationDelay: `${0.15 + i * 0.1}s` }} key={w.title} href="#" onClick={(e) => e.preventDefault()}>
                        <div className="ph"><img className={i % 2 ? 'float1' : ''} style={i % 2 ? { animationDelay: `${i * 0.8}s` } : undefined} src={w.img} alt={`${w.title} by ${w.artist}`} /></div>
                        <div className="row"><span className="t">{w.title}</span><span className="p">{w.price}</span></div>
                        <div className="a">{w.artist} {DOT} {w.kind}</div>
                    </a>
                ))}
            </div>
        </section>
        <section className="g-section">
            <div className="g-feature">
                <img className="wipe-up" src={artFigure} alt="Movement III, charcoal figure study by Sana Qureshi" />
                <div>
                    <p className="kicker rise d2">Piece of the day</p>
                    <h3 className="display rise d3">Movement III</h3>
                    <p className="rise d4">One red chalk line follows the dancer. Sana draws in a single sitting, so no two pieces in the series move the same way.</p>
                    <p className="meta rise d5">Sana Qureshi {DOT} Charcoal on black paper {DOT} <span style={{ color: 'var(--ink)' }}>{RU}6,800</span></p>
                </div>
            </div>
        </section>
        <ResaleShelf />
        <Foot note="Look 1, Midnight Gallery: a quiet gallery with a layered scene. Scroll inside it to move the artwork, background and type at different speeds." />
    </div>;
}


/* ---------------- Variant preview (illustrative) ---------------- */

const variantFinishes = [
    { name: 'Original red', deg: 0, bg: '#150b0b', glow: 'rgba(255,46,46,.14)' },
    { name: 'Forest cast', deg: 100, bg: '#0b130d', glow: 'rgba(70,200,120,.12)' },
    { name: 'Violet shift', deg: 260, bg: '#100b1c', glow: 'rgba(140,110,255,.14)' },
];

function VariantDemo() {
    const [v, setV] = useState(0);
    return <section className="v-sec">
        <div className="head">
            <h2 className="display">One piece, three finishes</h2>
            <span className="meta">Variant preview demo</span>
        </div>
        <p className="note">Tap a finish and the whole scene shifts with the piece: image, backdrop and mood move together. For artwork this would switch between real photos of each variant; here one dummy image shifts colour to show the interaction.</p>
        <div className="v-stage" style={{ background: variantFinishes[v].bg }}>
            <div className="v-ph">
                <div className="v-wipe" key={v} />
                <img src={artEmber} alt="Ember Study No. 4 shown in the selected finish" style={{ filter: `hue-rotate(${variantFinishes[v].deg}deg)`, boxShadow: `0 30px 80px -20px ${variantFinishes[v].glow}` }} />
                <span className="v-tag">{variantFinishes[v].name}</span>
            </div>
            <div className="v-dots" role="group" aria-label="Choose finish">
                {variantFinishes.map((f, i) => (
                    <button type="button" key={f.name} className={`v-dot${i === v ? ' on' : ''}`} style={{ filter: `hue-rotate(${f.deg}deg)` }} onClick={() => setV(i)} aria-pressed={i === v}>
                        <span className="sr">{f.name}</span>
                    </button>
                ))}
            </div>
        </div>
    </section>;
}

/* ---------------- Look 2: Kinetic Poster ---------------- */

function KineticWord({ text, className, base }: { text: string; className: string; base: number }) {
    return <span className={`p-word ${className}`}>{text.split('').map((ch, i) => (
        <span className="ch" style={{ animationDelay: `${base + i * 0.05}s` }} key={i}>{ch === ' ' ? '\u00A0' : ch}</span>
    ))}</span>;
}

function Poster({ still = false }: { still?: boolean }) {
    const [alt, setAlt] = useState(true);
    return <div className={`stage poster${still ? ' still' : ''}${alt ? ' alt' : ''}`}>
        <div className="grain" />
        <Pill look="Look 2 / 3" alt={alt} onToggle={() => setAlt(!alt)} />
        <header className="p-hero">
            <div className="p-words">
                <KineticWord text="ART" className="" base={0.1} />
                <span className="p-word imgfill rise" style={{ backgroundImage: `url(${artContour})`, animationDelay: '.35s' }}>MARKET</span>
                <KineticWord text="FOR ALL" className="outline" base={0.7} />
            </div>
            <div className="p-orbit" aria-label="Artwork in motion">
                <div className="orbit-ring" />
                <div className="orbit-back"><img src={artFigure} alt="A charcoal figure study" /></div>
                <div className="orbit-front"><img src={artCollage} alt="A layered paper collage" /></div>
                <span className="orbit-label ol-a">From the artist's studio</span>
                <span className="orbit-label ol-b"><i />Physical + digital</span>
                <span className="orbit-label ol-c">Find your own perspective</span>
                <span className="orbit-index">02 / A different point of view</span>
            </div>
            <div className="p-sub">
                <p className="s rise" style={{ animationDelay: '1s' }}>A place for physical pieces and digital editions, with the artwork and its maker in view.</p>
                <span className="meta rise" style={{ animationDelay: '1.1s' }}>Storefront concept 02</span>
            </div>
            <div className="p-marquee rise" style={{ animationDelay: '1.2s' }}>
                <div className="track">
                    {[0, 1].map((n) => <span key={n} aria-hidden={n === 1}>Originals only<i>{'\u25CF'}</i>Physical art<i>{'\u25CF'}</i>Digital editions<i>{'\u25CF'}</i>Direct from the artist<i>{'\u25CF'}</i>No reprints without permission<i>{'\u25CF'}</i></span>)}
                </div>
            </div>
        </header>
        <section className="p-strip">
            <div className="strip-head">
                <h2 className="display">On the wall</h2>
                <span className="meta">Swipe {'\u2192'}</span>
            </div>
            <div className="p-rail">
                {works.map((w, i) => (
                    <a className="p-tile" key={w.title} href="#" onClick={(e) => e.preventDefault()}>
                        <div className="ph">
                            <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                            <img src={w.img} alt={`${w.title} by ${w.artist}`} />
                            <span className="tag">{w.kind.split(` ${DOT}`)[0]}</span>
                        </div>
                        <div className="row"><span className="t">{w.title}</span><span className="p">{w.price}</span></div>
                        <div className="a">{w.artist}</div>
                    </a>
                ))}
            </div>
        </section>
        <VariantDemo />
        <section className="p-block">
            <div className="in">
                <h3>Sell what<br />you make.</h3>
                <p>A marketplace concept where artists show their work and collectors connect with them directly. Shown here as a visual demo only; the details are undecided.</p>
            </div>
        </section>
        <ResaleShelf />
        <div className="p-foot">
            <span className="demotag">Visual demo</span>
            <p className="meta" style={{ margin: 0, maxWidth: '52ch' }}>Look 2, Kinetic Poster: bold type, layered artwork and floating labels on a neutral canvas. Dummy artworks, artists and prices for layout only.</p>
            <Link className="meta" to="/" style={{ textDecoration: 'none' }}>{'\u2039'} Back to the three looks</Link>
        </div>
    </div>;
}

/* ---------------- Look 3: Raw Signal ---------------- */

function Signal({ still = false }: { still?: boolean }) {
    const [alt, setAlt] = useState(false);
    return <div className={`stage signal${still ? ' still' : ''}${alt ? ' alt' : ''}`}>
        <div className="grain" />
        <div className="s-scan" />
        <div className="s-ticker">
            <div className="track">
                {[0, 1].map((n) => <span key={n} aria-hidden={n === 1}>Discover your next piece <b>{'\u25CF'}</b> Originals only <b>{'\u25CF'}</b> Physical + digital <b>{'\u25CF'}</b> Made by hand, priced by the artist <b>{'\u25CF'}</b> </span>)}
            </div>
        </div>
        <Pill look="Look 3 / 3" alt={alt} onToggle={() => setAlt(!alt)} />
        <header className="s-hero">
            <p className="kicker rise d1">Underground storefront</p>
            <h1 className="glitch">
                <span className="base">RAW<br />SIGNAL</span>
                {still ? null : <span className="layer red" aria-hidden>RAW<br />SIGNAL</span>}
                {still ? null : <span className="layer ghost" aria-hidden>RAW<br />SIGNAL</span>}
            </h1>
            <div className="s-sub">
                <p className="s rise d3">Art with the polish left off. Touch a piece and the signal splits.</p>
                <span className="meta rise d4">6 works {DOT} dummy drop</span>
            </div>
        </header>
        <section className="s-grid">
            {works.map((w, i) => (
                <a className="s-cell rise" style={{ animationDelay: `${0.2 + i * 0.09}s` }} key={w.title} href="#" onClick={(e) => e.preventDefault()}>
                    <span className="x">{String(i + 1).padStart(2, '0')} / {w.kind.split(` ${DOT}`)[0]}</span>
                    <div className="ph">
                        <img src={w.img} alt={`${w.title} by ${w.artist}`} />
                        {still ? null : <div className="echo"><img src={w.img} alt="" aria-hidden /></div>}
                    </div>
                    <div className="row"><span className="t">{w.title}</span><span className="p">{w.price}</span></div>
                    <div className="a">{w.artist}</div>
                </a>
            ))}
        </section>
        <ResaleShelf />
        <div className="s-foot">
            <span className="demotag">Visual demo</span>
            <p className="meta" style={{ margin: 0, maxWidth: '52ch' }}>Look 3, Raw Signal: offset headline, ticker and collage grid. Dummy artworks, artists and prices for layout only.</p>
            <Link className="meta" to="/" style={{ textDecoration: 'none' }}>{'\u2039'} Back to the three looks</Link>
        </div>
    </div>;
}

export function App() {
    return <>
        <Routes>
            <Route path="/" element={<Chooser />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/poster" element={<Poster />} />
            <Route path="/signal" element={<Signal />} />
            <Route path="/still" element={<Chooser still />} />
            <Route path="/still/gallery" element={<Gallery still />} />
            <Route path="/still/poster" element={<Poster still />} />
            <Route path="/still/signal" element={<Signal still />} />
        </Routes>
    </>;
}
