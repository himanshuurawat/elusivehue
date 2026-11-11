import React, {useState} from 'react';
import {type SupabaseClient} from '@supabase/supabase-js';
import {cancelOrder, markRefundSent, respondRefund, UPI_ID, type OrderStatus, type RefundState} from './orders-service';
import './refund-parts.css';

/*
 * Cancel before dispatch and the refund that follows. Money moves only
 * between the buyer's and the artist's own UPI apps. These screens record who
 * says what; they never send, hold, verify or promise a refund.
 */

const STEPS = ['Cancel requested', 'Refund sent', 'Refund received'];
const idx = (s: RefundState) => (s === 'requested' ? 0 : s === 'sent' || s === 'not_received' ? 1 : 2);
const fill = (s: RefundState) => (s === 'requested' ? 0 : s === 'sent' || s === 'not_received' ? 50 : 100);

type Money = {amount_inr: number; delivery_fee_inr: number};
const total = (o: Money): string => '₹' + (o.amount_inr + o.delivery_fee_inr).toLocaleString('en-IN');

export function RefundTrack({state}: {state: RefundState}) {
  const i = idx(state);
  return <ol className="dl-track rf-track" style={{'--dl-fill': `${fill(state)}%`} as React.CSSProperties} aria-label="Refund progress">
    {STEPS.map((s, n) => <li key={s} className={n < i || (n === 2 && state === 'received') ? 'done' : n === i ? 'now' : ''} aria-current={n === i ? 'step' : undefined}><i aria-hidden="true"/><span>{s}</span></li>)}
  </ol>;
}

const Note = () => <p className="offer-note dl-small rf-fine">Payments and refunds go directly between the buyer and the artist on UPI. Elusive Hue does not hold, send or verify money. This does not limit your legal rights.</p>;

type Cancelable = Money & {id: string; status: OrderStatus; payment_state: string; delivery_state: string};
type Patch = {status: OrderStatus; refund_state: RefundState; refund_upi: string; cancelled_at: string};

export function BuyerCancel({client, order, onChanged}: {client: SupabaseClient; order: Cancelable; onChanged: (p: Patch) => void}) {
  const [open, setOpen] = useState(false);
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.status !== 'confirmed' || order.delivery_state !== 'none') return null;
  const checking = order.payment_state === 'buyer_marked';
  const paid = order.payment_state === 'received';
  const go = async () => {
    if (busy) return;
    const id = upi.trim();
    if (paid && !UPI_ID.test(id)) return setError('Enter a valid UPI ID, like name@bank.');
    setBusy(true); setError('');
    try {
      const r = await cancelOrder(client, order.id, paid ? id : '');
      onChanged({status: r.status, refund_state: r.refund_state, refund_upi: paid ? id : '', cancelled_at: new Date().toISOString()});
    } catch (e) {setError(e instanceof Error ? e.message : 'Could not cancel. Retry.'); setBusy(false);}
  };
  if (checking) return <p className="offer-note dl-small">The artist is still checking your payment. You can cancel once they answer.</p>;
  if (!open) return <p className="pay-actions"><button type="button" className="pay-secondary" onClick={() => setOpen(true)}>Cancel order</button></p>;
  return <div className="rf-sheet">
    <p className="offer-note"><strong>Cancel this order?</strong> {paid ? <>The artist confirmed your payment. They are asked to refund the full {total(order)} to your UPI. The site cannot send or guarantee the refund.</> : 'The artist has not confirmed any payment, so there is nothing to refund.'}</p>
    {paid && <label className="rf-field">Your UPI ID for the refund<input className="rf-input" value={upi} placeholder="name@bank" autoCapitalize="none" autoCorrect="off" inputMode="email" maxLength={80} disabled={busy} onChange={e => {setUpi(e.target.value); setError('');}}/></label>}
    {error && <p role="alert" className="offer-note rf-err">{error}</p>}
    <p className="pay-actions"><button type="button" className="pay-primary" disabled={busy} onClick={() => void go()}>{busy ? 'Saving...' : 'Yes, cancel order'}</button><button type="button" className="pay-secondary" disabled={busy} onClick={() => {setOpen(false); setError('');}}>Keep order</button></p>
  </div>;
}

type Refundable = Money & {id: string; refund_state: RefundState; refund_upi: string};

export function BuyerRefund({client, order, onChanged}: {client: SupabaseClient; order: Refundable; onChanged: (p: {refund_state: RefundState}) => void}) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const act = async (a: 'received' | 'not_received') => {
    if (busy) return;
    setBusy(a); setError('');
    try {await respondRefund(client, order.id, a); onChanged({refund_state: a});}
    catch (e) {setError(e instanceof Error ? e.message : 'Could not save this. Retry.');}
    finally {setBusy('');}
  };
  const s = order.refund_state;
  if (s === 'none') return <div className="dl-block"><p className="offer-note">This order was cancelled. The artist had not confirmed any payment, so there is nothing to refund.</p></div>;
  return <div className="dl-block rf-body" key={s}>
    <RefundTrack state={s}/>
    {s === 'requested' && <p className="offer-note"><strong>Cancellation sent.</strong> Waiting for the artist to send {total(order)} to <code className="dl-code">{order.refund_upi}</code>.</p>}
    {s === 'sent' && <p className="offer-note"><strong>The artist says they sent {total(order)}.</strong> Check your UPI app, then confirm.</p>}
    {(s === 'sent') && <p className="pay-actions"><button type="button" className="pay-primary" disabled={Boolean(busy)} onClick={() => void act('received')}>{busy === 'received' ? 'Saving...' : 'Refund received'}</button><button type="button" className="pay-secondary" disabled={Boolean(busy)} onClick={() => void act('not_received')}>{busy === 'not_received' ? 'Saving...' : "I haven't received it"}</button></p>}
    {s === 'not_received' && <><p className="offer-note"><strong>Marked as not received.</strong> The artist can see this.</p><p className="offer-note dl-small">Still no refund? Email <a className="rf-help" href="mailto:himanshurawathiki@gmail.com?subject=Refund%20not%20received">himanshurawathiki@gmail.com</a> with the artwork name and the date. Never send a UPI PIN or OTP. Elusive Hue cannot send the refund and cannot promise a result or a time.</p><p className="pay-actions"><button type="button" className="pay-secondary" disabled={Boolean(busy)} onClick={() => void act('received')}>{busy === 'received' ? 'Saving...' : 'It has arrived now'}</button></p></>}
    {s === 'received' && <p className="offer-note rf-ok"><strong>Refund confirmed.</strong> {total(order)} came back to your UPI. This order is closed.</p>}
    {error && <p role="alert" className="offer-note rf-err">{error}</p>}
    <Note/>
  </div>;
}

export function ArtistRefund({client, order, onChanged}: {client: SupabaseClient; order: Refundable & {first_name: string; buyer_phone?: string | null; buyer_email?: string | null}; onChanged: (p: {refund_state: RefundState}) => void}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const s = order.refund_state;
  const sent = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {await markRefundSent(client, order.id); onChanged({refund_state: 'sent'});}
    catch (e) {setError(e instanceof Error ? e.message : 'Could not save this. Retry.');}
    finally {setBusy(false);}
  };
  const phone = (order.buyer_phone ?? '').trim();
  const email = (order.buyer_email ?? '').trim();
  const how = phone ? 'phone' : 'email';
  const Phone = () => ((phone || email) && s !== 'received' ? <p className="offer-note dl-small">{order.first_name}'s {how}, given with the order: <code className="dl-code">{phone || email}</code></p> : null);
  const copy = () => {void navigator.clipboard?.writeText(order.refund_upi).then(() => setCopied(true), () => undefined);};
  if (s === 'none') return <div className="dl-block"><p className="offer-note">{order.first_name} cancelled this order. You had not confirmed any payment, so there is nothing to refund.</p></div>;
  return <div className="dl-block rf-body" key={s}>
    <RefundTrack state={s}/>
    {s === 'requested' && <>
      <p className="offer-note"><strong>{order.first_name} cancelled this order.</strong> Do not dispatch. Send {total(order)} back from your own UPI app to:</p>
      <p className="rf-copy"><code className="dl-code">{order.refund_upi}</code><button type="button" className="pay-copy" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></p>
      <p className="pay-actions"><button type="button" className="pay-primary" disabled={busy} onClick={() => void sent()}>{busy ? 'Saving...' : 'Refund sent'}</button></p>
    </>}
    {s !== 'received' && <Phone/>}
    {s === 'sent' && <p className="offer-note">You marked the refund as sent. Waiting for {order.first_name} to confirm it arrived.</p>}
    {s === 'received' && <p className="offer-note rf-ok"><strong>{order.first_name} confirmed the refund.</strong> This order is closed.</p>}
    {s === 'not_received' && <p className="offer-note"><strong>{order.first_name} says the refund has not arrived.</strong> Do not send it again yet. First check the transaction status and reference in your UPI app, and confirm the UPI ID <code className="dl-code">{order.refund_upi}</code> with {order.first_name}{phone || email ? ` using the ${how} above` : ''}.</p>}
    {error && <p role="alert" className="offer-note rf-err">{error}</p>}
    <Note/>
  </div>;
}
