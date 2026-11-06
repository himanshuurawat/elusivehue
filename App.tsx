import React, {useState} from 'react';
import {Routes, Route} from 'react-router-dom';
import {heroWide,artEmber,artGlitch,artFigure,artVessel,artContour,artCollage,resaleCamera,resaleBrushes,resaleJacket} from './artwork';
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
                <article className="r-card rise" style={{ animationDelay: `${0.15 + i * 0.1}s` }} key={r.title}>
                    <div className="ph">
                        <img src={r.img} alt={r.title} />
                        <span className="cond">{r.kind}</span>
                    </div>
                    <div className="row"><span className="t">{r.title}</span><span className="p">{r.price}</span></div>
                    <div className="a">Listed by {r.seller}</div>
                </article>
            ))}
        </div>
    </section>;
}

function Wordmark() {
    return <span className="wordmark">elusive<i>{DOT}</i>hue</span>;
}

function DepthScene({ pageFlow = false }: { pageFlow?: boolean }) {
    return <div className={`depth-scroll${pageFlow ? ' page-depth' : ''}`} data-page-depth={pageFlow ? 'true' : undefined} tabIndex={pageFlow ? undefined : 0} role="region" aria-label={pageFlow ? "Layered art scene, animated by page scrolling" : "Layered art scene. Scroll here to explore depth."} onScroll={e => { const el=e.currentTarget; el.style.setProperty('--depth', String(Math.min(1, el.scrollTop / 620))); }}>
        <div className="depth-track">
            <div className="depth-scene">
                <div className="depth-bg"><img src={heroWide} alt="A quiet abstract landscape of paint" /></div>
                <div className="depth-halo" />
                <div className="depth-title"><span className="kicker">An independent point of view</span><h2>Art has<br /><i>another layer.</i></h2></div>
                <div className="depth-mid"><img src={artFigure} alt="Charcoal figure on the middle plane" /><span>Study in movement / Physical</span></div>
                <div className="depth-front"><img src={artCollage} alt="Paper collage on the foreground plane" /><span>Objects with a story</span></div>
                <span className="depth-hint">{pageFlow ? 'Keep scrolling' : 'Scroll inside the scene'} <b>↓</b></span>
                <span className="depth-outro">A closer look.<br /><small>Different planes. One collection.</small></span>
            </div>
        </div>
    </div>;
}

function ArtworkPreview({work, onClose}: {work: typeof works[number] | null; onClose: () => void}) {
    const dialog = React.useRef<HTMLDialogElement>(null);
    const [detail, setDetail] = useState(false);
    React.useEffect(() => {
        setDetail(false);
        if (work && !dialog.current?.open) dialog.current?.showModal();
        if (!work && dialog.current?.open) dialog.current.close();
    }, [work]);
    return <dialog ref={dialog} className="art-dialog" onKeyDown={e => {
        if(e.key !== 'Tab') return;
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }} onClose={onClose} onClick={e => {if(e.target === e.currentTarget) onClose();}}>
        {work && <div className="art-detail">
            <button type="button" className="detail-close" aria-label="Close artwork preview" onClick={onClose}>Close ×</button>
            <div className={`detail-image${detail ? ' cropped' : ''}`}><img src={work.img} alt={`${work.title}, illustrative artwork`} /></div>
            <div className="detail-info">
                <p className="kicker">Artwork preview / dummy content</p>
                <h2 className="display">{work.title}</h2>
                <p className="detail-artist">{work.artist}</p>
                <div className="detail-facts"><span>{work.kind}</span><span>{work.price}</span></div>
                <p className="detail-note">Illustrative artwork, artist, medium and price. This is a frontend preview, not a listing or an offer.</p>
                <div className="image-controls" aria-label="Artwork view"><button type="button" aria-pressed={!detail} onClick={() => setDetail(false)}>Full artwork</button><button type="button" aria-pressed={detail} onClick={() => setDetail(true)}>Detail crop</button></div>
                <p className="meta">{detail ? 'An enlarged crop of the same dummy image.' : 'The complete image, with its original proportions.'}</p>
            </div>
        </div>}
    </dialog>;
}

function GalleryContinuation() {
    return <section className="gallery-continuation" aria-label="From a single mark to a collection">
        <div className="continuation-copy scroll-reveal"><p className="kicker">Keep looking</p><h2 className="display">One mark.<br /><i>Many worlds.</i></h2></div>
        <div className="unfold-scene" data-unfold>
            <div className="unfold-orbit" aria-hidden="true" />
            <figure className="unfold-piece unfold-left"><img src={artFigure} alt="Charcoal movement study" /><figcaption>01 / Gesture</figcaption></figure>
            <figure className="unfold-piece unfold-center"><img src={artCollage} alt="Textured paper collage" /><figcaption>02 / Texture</figcaption></figure>
            <figure className="unfold-piece unfold-right"><img src={artContour} alt="Abstract contour field" /><figcaption>03 / Possibility</figcaption></figure>
            <span className="unfold-line" aria-hidden="true" />
        </div>
        <div className="continuation-end scroll-reveal"><span className="meta">Different hands. A shared point of view.</span><span aria-hidden="true">↓</span></div>
    </section>;
}

function useGalleryMotion(root: React.RefObject<HTMLDivElement | null>, changing: string) {
    React.useEffect(() => {
        const el = root.current;
        if(!el) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const targets = [...el.querySelectorAll<HTMLElement>('.scroll-reveal, .art-open, .feature-image')];
        const depth = el.querySelector<HTMLElement>('[data-page-depth]');
        const unfold = el.querySelector<HTMLElement>('[data-unfold]');
        const journey = el.querySelector<HTMLElement>('[data-journey]');
        let frame = 0;
        const clamp = (v:number) => Math.max(0,Math.min(1,v));
        const update = () => {
            frame = 0;
            const bounds = el.getBoundingClientRect();
            const height = el.clientHeight;
            for(const target of targets) {
                if(reduced.matches || target.getBoundingClientRect().top < bounds.top + height * .96) target.classList.add('is-seen');
            }
            if(journey && depth && unfold) {
                const travelled = 80 - (journey.getBoundingClientRect().top - bounds.top);
                const upper = reduced.matches ? 0 : clamp(travelled/620);
                const handoff = reduced.matches ? 1 : clamp((travelled-620)/620);
                const lower = reduced.matches ? 1 : clamp((travelled-930)/560);
                const drift = reduced.matches ? 0 : clamp((travelled-1490)/500);
                depth.style.setProperty('--depth',String(upper));
                depth.dataset.progress = upper.toFixed(4);
                journey.style.setProperty('--cross',String(handoff));
                journey.dataset.progress = handoff.toFixed(4);
                unfold.style.setProperty('--unfold',String(lower));
                unfold.style.setProperty('--drift',String(drift));
                unfold.dataset.progress = lower.toFixed(4);
            }
        };
        const request = () => {if(!frame) frame=requestAnimationFrame(update);};
        targets.forEach(target=>target.classList.add('motion-ready'));
        unfold?.classList.add('motion-ready');
        el.addEventListener('scroll',request,{passive:true});
        window.addEventListener('resize',request,{passive:true});
        reduced.addEventListener('change',request);
        update();
        return () => {cancelAnimationFrame(frame);el.removeEventListener('scroll',request);window.removeEventListener('resize',request);reduced.removeEventListener('change',request);};
    }, [changing, root]);
}

function Gallery({ still = false }: { still?: boolean }) {
    const [alt, setAlt] = useState(false);
    const [filter, setFilter] = useState('All works');
    const galleryRoot = React.useRef<HTMLDivElement>(null);
    useGalleryMotion(galleryRoot, filter);
    const [selected, setSelected] = useState<typeof works[number] | null>(null);
    const visible = works.filter(w => filter === 'All works' || w.kind.startsWith(filter));
    const jump = (id: string) => document.getElementById(id)?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    return <div ref={galleryRoot} className={`stage gallery chosen-gallery${still ? ' still' : ''}${alt ? ' alt' : ''}`}>
        <div className="grain" />
        <nav className="pillnav chosen-nav" aria-label="Gallery navigation">
            <button className="brand-button" type="button" onClick={() => jump('gallery-top')} aria-label="Elusive Hue home"><Wordmark /></button>
            <button type="button" onClick={() => jump('collection')}>Collection</button>
            <button type="button" onClick={() => jump('secondhand')}>Resale</button>
            <button type="button" className="themebtn" onClick={() => setAlt(!alt)} aria-pressed={alt}>{alt ? 'Dark' : 'Light'}</button>
        </nav>
        <header className="g-hero" id="gallery-top">
            <span className="vert rise d3">Midnight Gallery {DOT} A different perspective</span>
            <p className="kicker rise d1">Elusive Hue / Art marketplace concept</p>
            <h1 className="display rise d2">Own the<br /><span>original.</span></h1>
            <div className="hero-line" />
            <div className="g-hero-art">
                <div className="scene-journey" data-journey>
                    <div className="journey-stage">
                        <div className="journey-upper"><DepthScene pageFlow /></div>
                        <div className="journey-lower"><GalleryContinuation /></div>
                    </div>
                </div>
                <div className="cap rise d4"><span className="meta">A moving collection {DOT} Six perspectives</span><button type="button" className="text-link" onClick={() => jump('collection')}>Explore the collection ↘</button></div>
            </div>
        </header>
        <section className="g-section" id="collection">
            <div className="head scroll-reveal"><div><p className="kicker">01 / The collection</p><h2 className="display">Find your perspective.</h2></div><span className="meta" aria-live="polite">{visible.length} {visible.length === 1 ? 'piece' : 'pieces'} / illustrative collection</span></div>
            <div className="collection-filter" aria-label="Filter artworks">{['All works','Physical','Digital'].map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div>
            <div className="g-works">
                {visible.map((w, i) => <button className="g-card art-open" style={{"--card-delay": `${(i % 2) * 90}ms`} as React.CSSProperties} type="button" key={w.title} onClick={() => setSelected(w)} aria-label={`Preview ${w.title}`}>
                    <div className="ph"><img src={w.img} alt={`${w.title}, illustrative artwork`} loading="lazy" /><span className="art-open-label">View artwork ↗</span></div>
                    <div className="row"><span className="t">{w.title}</span><span className="p">{w.price}</span></div><div className="a">{w.artist} {DOT} {w.kind}</div>
                </button>)}
            </div>
        </section>
        <section className="g-section">
            <div className="g-feature"><div className="feature-image"><img src={artFigure} alt="Movement III, illustrative charcoal figure study" loading="lazy" /></div><div className="scroll-reveal">
                <p className="kicker">02 / A closer look</p><h3 className="display">A study<br />in movement.</h3>
                <p>A figure held between stillness and motion. Take a closer look at the light, texture and marks.</p>
                <p className="meta">Movement III {DOT} Illustrative artwork</p><button type="button" className="gallery-cta" onClick={() => setSelected(works[2])}>Explore the artwork ↗</button>
            </div></div>
        </section>
        <div id="secondhand"><ResaleShelf /></div>
        <section className="g-section project-note"><p className="kicker">The idea behind Elusive Hue</p><h2 className="display">Room for art.<br />Room for stories.</h2><p>A planned home for physical artwork and digital editions, with a separate shelf for personal belongings. The two collections stay distinct.</p><details><summary>What works in this preview?</summary><p>Browse the artwork, filter physical and digital pieces, open full-image and detail-crop views, switch the theme and explore the layered scroll scene. All content is illustrative. There are no accounts, orders, payments or seller services.</p></details></section>
        <footer className="g-foot"><Wordmark /><p className="meta">Midnight Gallery / selected direction. Frontend preview only. All artworks, artists, mediums, prices and resale items are dummy content. Nothing is for sale here.</p><button className="text-link" type="button" onClick={() => jump('gallery-top')}>Back to the top ↑</button></footer>
        <ArtworkPreview work={selected} onClose={() => setSelected(null)} />
    </div>;
}

export function App(){return <Routes><Route path="/" element={<Gallery/>}/><Route path="/gallery" element={<Gallery/>}/></Routes>;}
