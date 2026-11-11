import React, {useState} from 'react';
import {type SupabaseClient} from '@supabase/supabase-js';
import {markDelivered, markDispatched, type DeliveryState} from './orders-service';
import './delivery-parts.css';

/*
 * Shared delivery pieces for the order screen: one progress line for both
 * sides and role-specific actions. The artist books and pays their own courier
 * and types the courier and tracking ID; the site shows what the artist
 * reported and never claims it verified the parcel.
 */

const STEPS = ['Accepted', 'Payment received', 'Dispatched', 'Delivered'];
const COURIERS = ['India Post', 'DTDC', 'Delhivery', 'Blue Dart', 'Other'];
const TRACK_ID = /^[A-Za-z0-9-]{6,30}$/;
const safeLink = (v: string): string => { try {const u = new URL(v); return u.protocol === 'https:' ? u.href : '';} catch {return '';} };

type Shape = {status: string; payment_state: string; delivery_state: DeliveryState};

export function deliveryStage(o: Shape): number {
  if (o.delivery_state === 'delivered') return 3;
  if (o.delivery_state === 'dispatched') return 2;
  return o.payment_state === 'received' ? 1 : 0;
}

export function OrderProgress({order}: {order: Shape}) {
  if (order.status !== 'confirmed') return null;
  const stage = deliveryStage(order);
  return <ol className="dl-track" style={{'--dl-fill': `${(stage / 3) * 100}%`} as React.CSSProperties} aria-label="Order progress">
    {STEPS.map((s, i) => <li key={s} className={i < stage || (i === 3 && stage === 3) ? 'done' : i === stage ? 'now' : ''} aria-current={i === stage ? 'step' : undefined}><i aria-hidden="true"/><span>{s}</span></li>)}
  </ol>;
}

export function TrackingInfo({courier, trackingId, trackingUrl}: {courier: string; trackingId: string; trackingUrl: string}) {
  const href = trackingUrl ? safeLink(trackingUrl) : '';
  return <p className="offer-note">Sent with <strong>{courier}</strong>, tracking ID <code className="dl-code">{trackingId}</code>.{href ? <> <a href={href} target="_blank" rel="noopener noreferrer">Open tracking page ↗</a></> : null}</p>;
}

export function BuyerDelivery({client, order, onChanged}: {client: SupabaseClient; order: Shape & {id: string; courier: string; tracking_id: string; tracking_url: string}; onChanged: (s: DeliveryState) => void}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.status !== 'confirmed') return null;
  const done = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {await markDelivered(client, order.id); onChanged('delivered');}
    catch (e) {setError(e instanceof Error ? e.message : 'Could not save this. Retry.');}
    finally {setBusy(false);}
  };
  return <div className="dl-block">
    <OrderProgress order={order}/>
    {order.delivery_state === 'none' && <p className="offer-note">{order.payment_state === 'received' ? 'The artist is packing your order. Tracking appears here once they send it.' : 'Delivery starts after the artist confirms your payment.'}</p>}
    {order.delivery_state !== 'none' && <TrackingInfo courier={order.courier} trackingId={order.tracking_id} trackingUrl={order.tracking_url}/>}
    {order.delivery_state === 'dispatched' && <p className="pay-actions"><button type="button" className="pay-primary" disabled={busy} onClick={() => void done()}>{busy ? 'Saving...' : 'I received it'}</button></p>}
    {order.delivery_state === 'delivered' && <p className="offer-note"><strong>Marked as delivered.</strong></p>}
    {order.status === 'confirmed' && <p className="offer-note dl-small">Tracking is entered by the artist. Elusive Hue does not verify the courier or the parcel.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}

export function ArtistDelivery({client, order, onChanged}: {client: SupabaseClient; order: Shape & {id: string; courier: string; tracking_id: string; tracking_url: string}; onChanged: (v: {courier: string; tracking_id: string; tracking_url: string}) => void}) {
  const [editing, setEditing] = useState(false);
  const [courier, setCourier] = useState(COURIERS.includes(order.courier) ? order.courier : order.courier ? 'Other' : 'India Post');
  const [other, setOther] = useState(COURIERS.includes(order.courier) ? '' : order.courier);
  const [tid, setTid] = useState(order.tracking_id);
  const [link, setLink] = useState(order.tracking_url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.status !== 'confirmed') return null;
  const paid = order.payment_state === 'received';
  const save = async () => {
    if (busy) return;
    const name = courier === 'Other' ? other.trim() : courier;
    if (name.length < 2) return setError('Enter the courier name.');
    if (!TRACK_ID.test(tid.trim())) return setError('Tracking ID: 6 to 30 letters, numbers or dashes.');
    if (link.trim() && !safeLink(link.trim())) return setError('The tracking link must start with https://');
    setBusy(true); setError('');
    try {
      const url = link.trim() ? safeLink(link.trim()) : '';
      await markDispatched(client, order.id, name, tid.trim(), url);
      onChanged({courier: name, tracking_id: tid.trim(), tracking_url: url}); setEditing(false);
    } catch (e) {setError(e instanceof Error ? e.message : 'Could not save this. Retry.');}
    finally {setBusy(false);}
  };
  const showForm = paid && order.delivery_state !== 'delivered' && (order.delivery_state === 'none' || editing);
  return <div className="dl-block">
    <OrderProgress order={order}/>
    {!paid && <p className="offer-note">Confirm the payment from your own UPI app first. Then you can add the courier and tracking.</p>}
    {showForm && <>
      <p className="offer-note">Pack it, send it with a courier you choose and pay yourself, then enter the details here.</p>
      <div className="dl-form">
        <label>Courier<select value={courier} onChange={e => setCourier(e.target.value)} disabled={busy}>{COURIERS.map(c => <option key={c}>{c}</option>)}</select></label>
        {courier === 'Other' && <label>Courier name<input value={other} maxLength={40} onChange={e => setOther(e.target.value)} disabled={busy}/></label>}
        <label>Tracking ID<input value={tid} maxLength={30} autoCapitalize="characters" onChange={e => setTid(e.target.value)} disabled={busy}/></label>
        <label>Tracking link (optional)<input value={link} inputMode="url" placeholder="https://" maxLength={300} onChange={e => setLink(e.target.value)} disabled={busy}/></label>
      </div>
      <p className="pay-actions"><button type="button" className="pay-primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving...' : order.delivery_state === 'none' ? 'Mark as dispatched' : 'Save changes'}</button>{editing && <button type="button" className="pay-secondary" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>}</p>
    </>}
    {order.delivery_state !== 'none' && !showForm && <>
      <TrackingInfo courier={order.courier} trackingId={order.tracking_id} trackingUrl={order.tracking_url}/>
      {order.delivery_state === 'dispatched' && <p className="offer-note">Waiting for the buyer to confirm it arrived. <button type="button" className="pay-copy" onClick={() => setEditing(true)}>Edit tracking</button></p>}
      {order.delivery_state === 'delivered' && <p className="offer-note"><strong>The buyer marked it delivered.</strong></p>}
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
