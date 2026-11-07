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

function OfferDemo({work}: {work: typeof works[number]}) {
    const [open,setOpen]=useState(false);
    const [amount,setAmount]=useState('');
    const [counter,setCounter]=useState('');
    const [note,setNote]=useState('');
    const [status,setStatus]=useState('draft');
    const [error,setError]=useState('');
    const [history,setHistory]=useState<{who:string;text:string}[]>([]);
    const money=(value:string)=>'₹'+Number(value).toLocaleString('en-IN');
    const valid=(value:string)=>/^\d+$/.test(value)&&Number(value)>0&&Number(value)<=10000000;
    const add=(who:string,text:string)=>setHistory(h=>[...h,{who,text}]);
    const request=()=>{if(!valid(amount)){setError('Enter a whole-rupee amount between ₹1 and ₹1,00,00,000.');return;}setError('');add('Buyer',`Offered ${money(amount)}${note.trim()?` · ${note.trim()}`:''}`);setStatus('pending');setNote('');};
    const reset=()=>{setStatus('draft');setHistory([]);setAmount('');setCounter('');setNote('');setError('');};
    return <section className="offer-demo" aria-label="Bargaining demo">
        <div className="offer-intro"><div><span className="kicker">A conversation about price</span><h3 className="display">Make an offer.</h3><p>Have a price in mind? Start a request with the artist.</p></div><button type="button" className="offer-start" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Hide offer demo':'Try offer demo ↗'}</button></div>
        {open&&<div className="offer-flow"><p className="offer-demo-label">Interactive demo only · Nothing is sent or saved.</p>
            <div className="offer-price-line"><span>Public listing price</span><strong>{work.price}</strong></div>
            {history.length>0&&<ol className="offer-history" aria-live="polite">{history.map((item,i)=><li key={i}><span>{item.who}</span><p>{item.text}</p></li>)}</ol>}
            {(status==='draft'||status==='counter')&&<form onSubmit={e=>{e.preventDefault();request();}} className="offer-buyer-form"><label>Your offer · INR<input inputMode="numeric" type="text" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter your price" maxLength={8}/></label><label>Note to artist · optional<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={200} placeholder="Add a short note" rows={2}/></label><button type="button" onClick={request}>{status==='counter'?'Send another offer · demo':'Send offer request · demo'}</button></form>}
            {status==='pending'&&<div className="offer-artist-panel"><p className="kicker">Artist preview · simulated response</p><p>Request for {work.title}. Choose how the artist responds in this demo.</p><div className="offer-actions"><button type="button" onClick={()=>{add('Artist · simulated',`Accepted ${money(amount)}`);setStatus('accepted');}}>Accept offer</button><button type="button" onClick={()=>{add('Artist · simulated','Declined this request');setStatus('declined');}}>Decline</button></div><form onSubmit={e=>{e.preventDefault();if(!valid(counter)){setError('Enter a valid whole-rupee counter-offer.');return;}setError('');add('Artist · simulated',`Counter-offered ${money(counter)}`);setStatus('counter');}}><label>Artist counter-offer · INR<input inputMode="numeric" type="text" value={counter} onChange={e=>setCounter(e.target.value)} placeholder="Another price" maxLength={8}/></label><button type="button" onClick={()=>{if(!valid(counter)){setError('Enter a valid whole-rupee counter-offer.');return;}setError('');add('Artist · simulated',`Counter-offered ${money(counter)}`);setStatus('counter');}}>Send counter-offer · demo</button></form></div>}
            {status==='counter'&&<div className="offer-counter"><p>Artist counter-offer: <strong>{money(counter)}</strong></p><button type="button" onClick={()=>{setAmount(counter);add('Buyer',`Accepted counter-offer ${money(counter)}`);setStatus('accepted');}}>Accept counter-offer · demo</button><p>Or continue negotiating with another offer above.</p></div>}
            {status==='accepted'&&<div className="offer-result" role="status"><span className="kicker">Agreement preview</span><h4 className="display">Agreed: {money(amount)}</h4><p>For this buyer and request only. Public listing price stays {work.price}. This demo creates no purchase, reservation or payment.</p></div>}
            {status==='declined'&&<p className="offer-result" role="status">Request declined in this demo. The listing remains unchanged.</p>}
            {error&&<p className="offer-error" role="alert">{error}</p>}
            {status!=='draft'&&<button type="button" className="offer-reset" onClick={reset}>Start a fresh demo</button>}
        </div>}
    </section>;
}

function ArtworkPreview({work, onClose}: {work: typeof works[number] | null; onClose: () => void}) {
    const dialog = React.useRef<HTMLDialogElement>(null);
    const views = ['Full artwork','Angled view','Detail crop'];
    const [finish,setFinish] = useState(0);
    const [view,setView] = useState('Full artwork');
    const [tilt,setTilt] = useState(0);
    const [direction,setDirection] = useState(1);
    const [moving,setMoving] = useState(true);
    const drag = React.useRef<{x:number;angle:number}|null>(null);
    const finishes = [{name:'Bare',tone:'#191b1b',edge:'transparent'},{name:'Oak',tone:'#343027',edge:'#a1815e'},{name:'Ink',tone:'#17282a',edge:'#111a1c'}];
    React.useEffect(() => {
        setMoving(true);setFinish(0);setView('Full artwork');setTilt(0);
        if(work && !dialog.current?.open) {dialog.current?.showModal();dialog.current?.querySelector<HTMLButtonElement>('.product-close')?.focus({preventScroll:true});if(dialog.current)dialog.current.scrollTop=0;}
        if(!work && dialog.current?.open)dialog.current.close();
    },[work]);
    React.useEffect(() => {
        if(!work || !dialog.current)return;
        const root=dialog.current;
        const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('chapter-visible',entry.isIntersecting)),{root,threshold:.16});
        root.querySelectorAll('.product-feature,.product-story-intro').forEach(el=>observer.observe(el));
        return ()=>observer.disconnect();
    },[work]);
    const current=work || works[0], index=works.indexOf(current), viewIndex=views.indexOf(view);
    const sampleSpecs=[
        {size:'Large',dimensions:'60 × 80 cm',dimensionLabel:'Width × height',medium:'Oil on canvas'},
        {size:'Medium',dimensions:'2400 × 3200 px',dimensionLabel:'Digital canvas',medium:'Digital artwork'},
        {size:'Medium',dimensions:'30 × 42 cm',dimensionLabel:'Width × height',medium:'Charcoal on paper'},
        {size:'Small',dimensions:'18 × 24 cm',dimensionLabel:'Diameter × height',medium:'Stoneware'},
        {size:'Large',dimensions:'3600 × 4800 px',dimensionLabel:'Digital canvas',medium:'Generative print'},
        {size:'Small',dimensions:'21 × 29.7 cm',dimensionLabel:'Width × height',medium:'Mixed media'},
    ];
    const specs=sampleSpecs[index];
    const before=views[(viewIndex+views.length-1)%views.length], after=views[(viewIndex+1)%views.length];
    const change=(step:number)=>{setDirection(step);setView(views[(viewIndex+step+views.length)%views.length]);setTilt(0);};
    const angle=view==='Detail crop'?0:tilt+(view==='Angled view'?-22:0);
    return <dialog ref={dialog} className="art-dialog product-dialog" aria-label={work ? `${current.title} artwork view`:'Artwork view'} onClose={onClose} onKeyDown={e=>{
        if(e.key!=='Tab')return;
        const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled])'));
        const first=buttons[0],last=buttons[buttons.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }}>
        {work && <div className="product-world" style={{'--product-tone':finishes[finish].tone,'--frame-tone':finishes[finish].edge,'--entry':`${direction*42}px`,'--scene-tone':view==='Detail crop'?'#26302d':view==='Angled view'?'#292b32':finishes[finish].tone} as React.CSSProperties}>
            <div className="product-top"><span className="kicker">Elusive Hue / Viewing room</span><button type="button" className="product-close" aria-label="Close artwork preview" onClick={onClose}>Close ×</button></div>
            <div className={`product-showcase view-${viewIndex}`}>
                <div className="product-scene-sweep" key={`sweep-${view}-${finish}`} aria-hidden="true"/>
                <div className="product-chapter-nav" aria-hidden="true"><span className={viewIndex===0?'active':''}>01 / Composition</span><span className={viewIndex===1?'active':''}>02 / Perspective</span><span className={viewIndex===2?'active':''}>03 / Detail</span></div>
                <div className={`product-stage${view==='Detail crop'?' is-detail':''}${moving?' is-moving':''}`}>
                    <div className="product-orbit-points" key={`points-${view}`} aria-label="Artwork quick details"><div className="orbit-point point-artist"><span>Artist</span><strong>{current.artist}</strong></div><div className="orbit-point point-type"><span>Format</span><strong>{current.kind.split(' · ')[0]}</strong></div><div className="orbit-point point-medium"><span>Medium</span><strong>{specs.medium}</strong></div><div className="orbit-point point-view"><span>Size · sample</span><strong>{specs.size}</strong><small>{specs.dimensions}</small></div></div>
                    <span className="product-word" aria-hidden="true">{current.title.split(' ')[0]}</span>
                    <button type="button" className="product-neighbor neighbor-before" onClick={()=>change(-1)} aria-label={`Previous view: ${before}`}><img className={before==='Detail crop'?'neighbor-crop':before==='Angled view'?'neighbor-angle':''} src={current.img} alt="" /><span>← {before}</span></button>
                    <div key={`${current.title}-${view}-${finish}`} className="product-object" style={{'--angle':`${angle}deg`,'--zoom':view==='Detail crop'?'1.65':'1'} as React.CSSProperties}
                        onPointerDown={e=>{if(e.button!==0||view==='Detail crop')return;drag.current={x:e.clientX,angle:tilt};e.currentTarget.setPointerCapture(e.pointerId);}}
                        onPointerMove={e=>{if(drag.current)setTilt(Math.max(-28,Math.min(28,drag.current.angle+(e.clientX-drag.current.x)*.18)));}}
                        onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
                        <div className={`product-frame finish-${finish}`}><div className="product-depth"><img src={current.img} alt={`${current.title}, illustrative artwork`} draggable={false}/></div></div>
                    </div>
                    <button type="button" className="product-neighbor neighbor-after" onClick={()=>change(1)} aria-label={`Next view: ${after}`}><img className={after==='Detail crop'?'neighbor-crop':after==='Angled view'?'neighbor-angle':''} src={current.img} alt=""/><span>{after} →</span></button>
                    <span className="product-ground" aria-hidden="true"/>
                    <div className="product-stage-caption"><span>View {String(viewIndex+1).padStart(2,'0')} / 03</span><span>{view==='Detail crop'?'A closer look at the same image':'Drag artwork to change perspective'}</span></div>
                </div>
                <div className="product-mini-notes" key={`notes-${view}`}><span>0{viewIndex+1} / {view==='Detail crop'?'Inside the image':view==='Angled view'?'A different perspective':'The whole picture'}</span><button type="button" className="product-motion-toggle" aria-pressed={!moving} onClick={()=>setMoving(!moving)}>{moving?'Pause motion':'Resume motion'}</button></div>
                <div className="product-summary" aria-live="polite"><div><p className="kicker">{current.kind.split(' · ')[0]} / {current.artist}</p><h2 className="display">{current.title}</h2></div><div className="product-buyless"><strong>{current.price}</strong><span>Illustrative price</span></div></div>
                <section className="product-basic-specs" aria-label="Basic artwork details"><div className="spec-heading"><span>Piece details</span><span>Sample specifications</span></div><dl><div><dt>Size class</dt><dd>{specs.size}</dd></div><div><dt>{specs.dimensionLabel}</dt><dd>{specs.dimensions}</dd></div><div><dt>Art medium</dt><dd>{specs.medium}</dd></div>{current.kind.includes('Edition')&&<div><dt>Edition</dt><dd>{current.kind.split(' · ').pop()}</dd></div>}</dl><p>Demo sizes only. Actual dimensions and medium come from the artist.</p></section>
                <OfferDemo key={current.title} work={current}/>
                <div className="product-toolbar"><div className="product-buttons" aria-label="Artwork view">{views.map(v=><button type="button" key={v} aria-pressed={view===v} onClick={()=>{setDirection(views.indexOf(v)>=viewIndex?1:-1);setView(v);setTilt(0);}}>{v}</button>)}</div><div className="product-finishes" aria-label="Display frame">{finishes.map((v,i)=><button type="button" key={v.name} aria-label={`${v.name} display`} aria-pressed={finish===i} onClick={()=>{setDirection(1);setFinish(i);}}><span style={{background:i===0?'#777':v.edge}}/>{v.name}</button>)}</div></div>
                <button type="button" className="product-details-link" onClick={()=>dialog.current?.querySelector('.product-story')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}>Look a little closer <span>↓</span></button>
            </div>
            <section className="product-story" aria-label="Artwork details">
                <div className="product-story-intro"><p className="kicker">Beyond the first look</p><h3 className="display">Made of details.</h3><p>Scroll through the image. From the smallest marks to the complete composition.</p></div>
                <div className="product-feature"><div className="product-feature-image texture-crop"><img src={current.img} alt={`Enlarged image detail of ${current.title}`} loading="lazy"/></div><div className="product-feature-copy"><span className="kicker">01 / A closer crop</span><h4 className="display">Look at the marks.</h4><p>A magnified section of the artwork image. Explore its colour, edges and texture.</p><button type="button" onClick={()=>{setView('Detail crop');if(dialog.current)dialog.current.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}>Open detail view ↗</button></div></div>
                <div className="product-feature feature-reverse"><div className="product-feature-image"><img src={current.img} alt={`${current.title} full image study`} loading="lazy"/></div><div className="product-feature-copy"><span className="kicker">02 / The whole picture</span><h4 className="display">A different perspective.</h4><dl><div><dt>Artist</dt><dd>{current.artist}</dd></div><div><dt>Art medium</dt><dd>{specs.medium}</dd></div><div><dt>Sample size</dt><dd>{specs.size} · {specs.dimensions}</dd></div><div><dt>Collection</dt><dd>{String(index+1).padStart(2,'0')} of 06</dd></div></dl></div></div>
                <p className="product-disclaimer">Illustrative concept only. Artwork, artists, mediums and prices are dummy content. Perspective uses a flat image, not a 3D scan. Display frames are visual studies, not purchase options. Nothing is for sale.</p>
            </section>
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
