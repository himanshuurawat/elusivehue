import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import './delivery-preview.css';

/*
 * Design preview of artist-managed delivery. Local state only: no account,
 * database, courier or network request is involved, and nothing is saved.
 * The artist ships with a courier of their own choice and types the courier
 * and tracking ID by hand. The site shows what the artist reports and never
 * claims it has verified the parcel.
 */

type Stage = 0 | 1 | 2 | 3 | 4;
const PRICE = 4200;
const FEE = 150;
const inr = (n: number): string => '₹' + n.toLocaleString('en-IN');
const STEPS = ['Confirmed', 'Payment received', 'Packed', 'Dispatched', 'Delivered'];
const COURIERS = ['India Post', 'DTDC', 'Delhivery', 'Blue Dart', 'Other'];
const TRACK_ID = /^[A-Za-z0-9-]{6,30}$/;
const safeLink = (v: string): string => { try {const u = new URL(v); return u.protocol === 'https:' ? u.href : '';} catch {return '';} };

function Track({stage}: {stage: Stage}) {
  return <ol className="dp-track" style={{'--dp-fill': `${(stage / 4) * 100}%`} as React.CSSProperties} aria-label="Order progress">
    {STEPS.map((s, i) => <li key={s} className={i < stage ? 'done' : i === stage ? 'now' : ''} aria-current={i === stage ? 'step' : undefined}><i aria-hidden="true"/><span>{s}</span></li>)}
  </ol>;
}

export function DeliveryPreview() {
  const [role, setRole] = useState<'artist' | 'buyer'>('artist');
  const [asked, setAsked] = useState(false);
  const [stage, setStage] = useState<Stage>(1);
  const [courier, setCourier] = useState('India Post');
  const [other, setOther] = useState('');
  const [tid, setTid] = useState('');
  const [link, setLink] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<{courier: string; tid: string; link: string} | null>(null);

  const dispatch = () => {
    const name = courier === 'Other' ? other.trim() : courier;
    if (!name) return setErr('Enter the courier name.');
    if (!TRACK_ID.test(tid.trim())) return setErr('Tracking ID: 6 to 30 letters, numbers or dashes.');
    if (link.trim() && !safeLink(link.trim())) return setErr('The tracking link must start with https://');
    setErr('');
    setSent({courier: name, tid: tid.trim(), link: link.trim() ? safeLink(link.trim()) : ''});
    setStage(3);
  };
  const reset = () => {setAsked(false); setRole('buyer'); setStage(1); setSent(null); setTid(''); setLink(''); setOther(''); setErr('');};

  return <main className="dp-page">
    <header className="dp-nav"><Link to="/" className="dp-wordmark">elusive<i>·</i>hue</Link><span className="dp-tag">Design preview · nothing is saved</span></header>
    <section className="dp-wrap">
      <p className="dp-kicker">Delivery</p>
      <h1 className="dp-title">Artist ships, buyer follows.</h1>
      {!asked ? <article className="dp-glass">
        <div className="dp-item"><div className="dp-thumb" aria-hidden="true"/><div><strong>Ember Study</strong><p>Physical artwork · sample data</p></div></div>
        <dl className="dp-total"><div><dt>Artwork (agreed price)</dt><dd>{inr(PRICE)}</dd></div><div><dt>Delivery, set by the artist</dt><dd>{inr(FEE)}</dd></div><div className="sum"><dt>Total you pay the artist</dt><dd>{inr(PRICE + FEE)}</dd></div></dl>
        <p className="dp-note">You see the full total before sending the request. You pay the artist directly in your UPI app after they confirm.</p>
        <button className="dp-btn" onClick={() => {setAsked(true); setRole('buyer');}}>Send order request</button>
      </article> : <article className="dp-glass">
        <div className="dp-item"><div className="dp-thumb" aria-hidden="true"/><div><strong>Sample order · Ember Study</strong><p>{inr(PRICE + FEE)} total ({inr(PRICE)} + {inr(FEE)} delivery) · sample data</p></div></div>
        <Track stage={stage}/>
        {role === 'artist' ? <div className="dp-body">
          {stage === 1 && <><p>The buyer paid you directly. After you see it in your own UPI app, confirm it.</p><button className="dp-btn" onClick={() => setStage(2)}>Payment received in my app</button></>}
          {stage === 2 && <><p>Pack it safely, then enter how you are sending it. You choose the courier and pay it yourself.</p>
            <div className="dp-form">
              <label>Courier<select value={courier} onChange={e => setCourier(e.target.value)}>{COURIERS.map(c => <option key={c}>{c}</option>)}</select></label>
              {courier === 'Other' && <label>Courier name<input value={other} maxLength={40} onChange={e => setOther(e.target.value)}/></label>}
              <label>Tracking ID<input value={tid} maxLength={30} autoCapitalize="characters" onChange={e => setTid(e.target.value)}/></label>
              <label>Tracking link <em>(optional)</em><input value={link} inputMode="url" placeholder="https://" onChange={e => setLink(e.target.value)}/></label>
            </div>
            {err && <p role="alert" className="dp-err">{err}</p>}
            <button className="dp-btn" onClick={dispatch}>Mark as dispatched</button></>}
          {stage >= 3 && sent && <><p>Dispatched with <strong>{sent.courier}</strong>, ID <code>{sent.tid}</code>. {stage === 3 ? 'Waiting for the buyer to confirm it arrived.' : 'The buyer confirmed delivery.'}</p></>}
        </div> : <div className="dp-body">
          {stage < 3 && <p>{stage === 1 ? 'Waiting for the artist to confirm your payment.' : 'The artist is packing your order.'}</p>}
          {stage >= 3 && sent && <><p>The artist says it is on its way with <strong>{sent.courier}</strong>. Tracking ID <code>{sent.tid}</code>.</p>
            {sent.link && <p><a className="dp-link" href={sent.link} target="_blank" rel="noopener noreferrer">Open tracking page ↗</a></p>}
            {stage === 3 && <button className="dp-btn" onClick={() => setStage(4)}>I received it</button>}
            {stage === 4 && <p className="dp-ok">Marked as delivered. Thanks for confirming.</p>}</>}
        </div>}
        <p className="dp-note">Tracking is entered by the artist. Elusive Hue does not verify the courier or the parcel.</p>
      </article>}
      {asked && <div className="dp-as"><span>Preview only, one screen in the real app. Viewing as</span>{(['buyer', 'artist'] as const).map(r => <button key={r} className={role === r ? 'on' : ''} aria-pressed={role === r} onClick={() => setRole(r)}>{r}</button>)}</div>}
      <button className="dp-reset" onClick={reset}>Restart demo</button>
    </section>
  </main>;
}
