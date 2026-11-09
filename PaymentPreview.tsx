import React, {useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {artFigure} from './artwork';
import './artwork-studio.css';
import './payment-preview.css';

/*
 * Interactive layout demo for the direct-payment idea: after an artist
 * accepts an order request, the buyer pays the artist's own UPI QR, and
 * the artist confirms from their own payment app. This page is dummy data
 * only - the QR is decorative, no payment is made, nothing is sent or
 * saved. The order of steps matches the agreed flow: accept first, then
 * payment. Optional ?step= seeds a state for previews.
 */

type Step = 'requested' | 'accepted' | 'marked' | 'received' | 'declined' | 'missing';

const steps: Step[] = ['requested', 'accepted', 'marked', 'received', 'declined', 'missing'];

const demo = {
  art: artFigure,
  title: 'Movement III',
  artist: 'Sana Qureshi',
  amount: 6800,
  buyer: 'Aarav',
};

const rupees = (n: number): string => '₹' + n.toLocaleString('en-IN');

function seedStep(search: string): Step {
  const value = new URLSearchParams(search).get('step') ?? '';
  return (steps as string[]).includes(value) ? (value as Step) : 'requested';
}

/* Decorative QR look-alike. It encodes nothing and scans to nothing. */
function SampleQr() {
  const size = 21;
  const cells: boolean[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = (x * 31 + y * 17 + x * y * 7 + 13) % 5;
    cells.push(v === 0 || v === 3);
  }
  const finder = (cx: number, cy: number) => (
    <g key={`f${cx}${cy}`}>
      <rect x={cx} y={cy} width={7} height={7} fill="#111" />
      <rect x={cx + 1} y={cy + 1} width={5} height={5} fill="#fff" />
      <rect x={cx + 2} y={cy + 2} width={3} height={3} fill="#111" />
    </g>
  );
  return <svg className="pay-qr-svg" viewBox={`-1 -1 ${size + 2} ${size + 2}`} role="img" aria-label="Sample QR placeholder. It is decorative and does not work.">
    <rect x={-1} y={-1} width={size + 2} height={size + 2} fill="#fff" />
    {cells.map((on, i) => on ? <rect key={i} x={i % size} y={Math.floor(i / size)} width={1} height={1} fill="#111" /> : null)}
    {finder(0, 0)}{finder(size - 7, 0)}{finder(0, size - 7)}
    <text x={size / 2} y={size / 2 + 1.6} textAnchor="middle" fontSize="3.4" fill="#b3121f" transform={`rotate(-45 ${size / 2} ${size / 2})`} letterSpacing="0.6">SAMPLE</text>
  </svg>;
}

function StatusPill({step}: {step: Step}) {
  const text: Record<Step, string> = {
    requested: 'Waiting for artist',
    accepted: 'Accepted · pay the artist',
    marked: 'Checking payment',
    received: 'Payment received',
    declined: 'Declined',
    missing: 'Payment not found',
  };
  return <span className={`pay-pill pay-pill-${step}`}>{text[step]}</span>;
}

function BuyerPanel({step, onPay}: {step: Step; onPay: () => void}) {
  return <section className="pay-panel" aria-label="What the buyer sees" key={`b-${step}`}>
    <p className="pay-who rise">Buyer sees</p>
    <div className="pay-card rise" style={{animationDelay: '.08s'}}>
      <div className="pay-card-top">
        <img src={demo.art} alt={demo.title} />
        <div><strong>{demo.title}</strong><span>by {demo.artist}</span></div>
        <em>{rupees(demo.amount)}</em>
      </div>
      <StatusPill step={step} />
      {step === 'requested' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>Your request is with {demo.artist}. Payment opens only if they accept - until then there is nothing to pay and no QR.</p>}
      {step === 'accepted' && <div className="pay-qr-block rise" style={{animationDelay: '.16s'}}>
        <SampleQr />
        <p className="pay-note">Scan with any UPI app and pay <strong>{rupees(demo.amount)}</strong> to {demo.artist}. Check the name shown in your app matches the artist before you pay.</p>
        <p className="pay-warn">Pay only the QR shown here, inside your order. Never a code sent over chat.</p>
        <button type="button" className="pay-primary" onClick={onPay}>I have paid · demo</button>
      </div>}
      {step === 'marked' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>Marked as paid. {demo.artist} is checking their own UPI app for {rupees(demo.amount)}. Your order confirms when they find the payment.</p>}
      {step === 'received' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>{demo.artist} confirmed {rupees(demo.amount)} in their app. The order is placed. Next the artist arranges delivery with you.</p>}
      {step === 'declined' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>{demo.artist} declined the request. Nothing was paid, and the listing stays as it is.</p>}
      {step === 'missing' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>{demo.artist} could not find {rupees(demo.amount)} in their app yet. Keep your app's payment receipt - you can show it to them while you sort it out together.</p>}
    </div>
  </section>;
}

function ArtistPanel({step, onAccept, onDecline, onGot, onMissing, onRecheck}: {
  step: Step;
  onAccept: () => void;
  onDecline: () => void;
  onGot: () => void;
  onMissing: () => void;
  onRecheck: () => void;
}) {
  return <section className="pay-panel" aria-label="What the artist sees" key={`a-${step}`}>
    <p className="pay-who rise">Artist sees</p>
    <div className="pay-card rise" style={{animationDelay: '.08s'}}>
      <div className="pay-card-top">
        <img src={demo.art} alt={demo.title} />
        <div><strong>Request from {demo.buyer}</strong><span>for {demo.title}</span></div>
        <em>{rupees(demo.amount)}</em>
      </div>
      <StatusPill step={step} />
      {step === 'requested' && <div className="pay-actions rise" style={{animationDelay: '.16s'}}>
        <p className="pay-note">{demo.buyer} wants this piece at {rupees(demo.amount)}. Accept to show your payment QR to this buyer only.</p>
        <div className="pay-btn-row">
          <button type="button" className="pay-primary" onClick={onAccept}>Accept request · demo</button>
          <button type="button" className="pay-ghost" onClick={onDecline}>Decline · demo</button>
        </div>
      </div>}
      {step === 'accepted' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>You accepted. {demo.buyer}'s contact details are now visible to you, as with any accepted request. Your QR is visible to {demo.buyer} on this order only - not on your public page. Wait for them to pay.</p>}
      {step === 'marked' && <div className="pay-actions rise" style={{animationDelay: '.16s'}}>
        <p className="pay-note">{demo.buyer} says they paid {rupees(demo.amount)}.</p>
        <p className="pay-warn">Check your own UPI app before confirming. A screenshot from the buyer is not proof.</p>
        <div className="pay-btn-row">
          <button type="button" className="pay-primary" onClick={onGot}>Payment received in my app · demo</button>
          <button type="button" className="pay-ghost" onClick={onMissing}>I can't find this payment · demo</button>
        </div>
      </div>}
      {step === 'received' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>You confirmed {rupees(demo.amount)} from your own app. The order is placed. {demo.buyer}'s contact details were already shared when you accepted.</p>}
      {step === 'declined' && <p className="pay-note rise" style={{animationDelay: '.16s'}}>You declined this request. The buyer was never shown a QR, and the listing stays up.</p>}
      {step === 'missing' && <div className="pay-actions rise" style={{animationDelay: '.16s'}}>
        <p className="pay-note">No {rupees(demo.amount)} from {demo.buyer} in your app yet. The buyer has been asked to keep their receipt. Recheck when the payment lands.</p>
        <div className="pay-btn-row"><button type="button" className="pay-ghost" onClick={onRecheck}>Recheck my app · demo</button></div>
      </div>}
    </div>
  </section>;
}

export function PaymentPreview() {
  const {search} = useLocation();
  const [step, setStep] = useState<Step>(() => seedStep(search));
  const reset = () => setStep('requested');

  return <main className="artwork-workspace pay-preview">
    <header className="workspace-nav"><Link to="/">elusive · hue</Link><Link to="/orders">My orders ↗</Link></header>
    <section className="workspace-body">
      <p className="kicker">Layout demo · nothing is saved or paid</p>
      <h1 className="display">Direct payment.</h1>
      <p className="workspace-intro">The artist accepts your request first. Only then does their payment QR appear, on your order alone. You pay them directly; they confirm from their own UPI app. This page walks both sides with dummy data - the QR is a sample and scans to nothing.</p>
      <div className="pay-grid">
        <BuyerPanel step={step} onPay={() => setStep('marked')} />
        <ArtistPanel
          step={step}
          onAccept={() => setStep('accepted')}
          onDecline={() => setStep('declined')}
          onGot={() => setStep('received')}
          onMissing={() => setStep('missing')}
          onRecheck={() => setStep('marked')}
        />
      </div>
      {(step === 'received' || step === 'declined') && <button type="button" className="pay-ghost pay-reset" onClick={reset}>Replay the demo ↺</button>}
      <div className="pay-facts">
        <p className="selling-kicker">What stays true in the real version</p>
        <ul>
          <li>The QR shows on one accepted order, to one buyer - never on a public listing or profile.</li>
          <li>The artist confirms only from their own payment app. A buyer screenshot is never proof.</li>
          <li>In this proposed flow, payment goes directly to the artist.</li>
          <li>For payment issues, contact the artist. Keep your receipt; this demo does not define refund or complaint policies.</li>
        </ul>
      </div>
    </section>
    <footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
