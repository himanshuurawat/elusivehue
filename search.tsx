import React, {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {artistParam, artworkParam, publicClient, searchPublic, type SearchResults} from './public-service';
import {WaitOrb} from './wait-orb';

/*
 * GallerySearch: one field in the pill nav that finds artists (username or
 * display name) and published works (title) as you type, then a tap opens
 * the artist's page or the work itself. Reads stay anonymous and go through
 * the same row policies the public pages already use.
 */
export function GallerySearch() {
    const client = publicClient();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [phase, setPhase] = useState<'idle' | 'searching' | 'done'>('idle');
    const [results, setResults] = useState<SearchResults>({artists: [], works: []});
    const input = useRef<HTMLInputElement>(null);
    const seq = useRef(0);

    useEffect(() => {
        if (!open || !client) return;
        const q = query.trim();
        if (q.length < 2) {
            setPhase('idle');
            setResults({artists: [], works: []});
            return;
        }
        const id = ++seq.current;
        setPhase('searching');
        const timer = setTimeout(() => {
            searchPublic(client, q)
                .then(r => { if (seq.current === id) { setResults(r); setPhase('done'); } })
                .catch(() => { if (seq.current === id) { setResults({artists: [], works: []}); setPhase('done'); } });
        }, 240);
        return () => clearTimeout(timer);
    }, [query, open, client]);

    if (!client) return null;

    const close = () => { setOpen(false); setQuery(''); setPhase('idle'); };
    const show = () => { setOpen(true); requestAnimationFrame(() => input.current?.focus()); };
    const hits = results.artists.length + results.works.length;
    const loupe = <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;

    return <>
        <button type="button" className="search-trigger" aria-label="Search artists and works" aria-expanded={open} onClick={open ? close : show}>{loupe}</button>
        {open && <div className="search-overlay">
            <div className="search-backdrop" onClick={close} />
            <section className="search-panel" aria-label="Search artists and works">
                <div className="search-field">
                    {loupe}
                    <input
                        ref={input}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') close(); }}
                        placeholder="Artist or artwork name"
                        aria-label="Artist or artwork name"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {phase === 'searching' && <WaitOrb label="Searching" size={26} inline />}
                </div>
                {phase === 'idle' && <p className="search-note meta">Type a username or a work's title. Matches appear as you type.</p>}
                {phase === 'done' && hits === 0 && <p className="search-note meta">No artist or work matches "{query.trim()}" yet.</p>}
                {phase !== 'idle' && hits > 0 && <div className="search-results">
                    {results.artists.length > 0 && <div className="search-group">
                        <p className="search-group-label">Artists</p>
                        {results.artists.map((a, i) => <Link key={a.id} className="search-row" style={{animationDelay: `${i * 70}ms`}} to={`/artist/${artistParam(a)}`} onClick={close}>
                            <span className="search-avatar" aria-hidden="true">{(a.display_name || a.username || '?').trim().charAt(0).toUpperCase()}</span>
                            <span className="search-row-copy"><strong>{a.display_name || a.username}</strong>{a.username && <span className="meta">@{a.username}</span>}</span>
                            <span className="search-go" aria-hidden="true">→</span>
                        </Link>)}
                    </div>}
                    {results.works.length > 0 && <div className="search-group">
                        <p className="search-group-label">Works</p>
                        {results.works.map((g, i) => <Link key={g.work.id} className="search-row" style={{animationDelay: `${(results.artists.length + i) * 70}ms`}} to={`/artwork/${artworkParam(g.work)}`} onClick={close}>
                            {g.photo ? <img className="search-thumb" src={g.photo} alt="" /> : <span className="search-thumb search-thumb-blank" aria-hidden="true" />}
                            <span className="search-row-copy"><strong>{g.work.title}</strong><span className="meta">{g.work.format}{g.work.sold_out ? ' · Sold out' : g.work.for_sale ? ` · ₹${g.work.asking_price_inr.toLocaleString('en-IN')}` : ''}</span></span>
                            <span className="search-go" aria-hidden="true">→</span>
                        </Link>)}
                    </div>}
                </div>}
            </section>
        </div>}
    </>;
}
