import React, {useEffect, useRef, useState} from 'react';
import {WaitOrb} from './PublicPages';
import {Link, useParams} from 'react-router-dom';
import {configuredAccountClient} from './account-service';
import {artworkParam, type SharedArtwork} from './public-service';
import {markOrderPaid, paymentQrUrl, type PaymentState} from './payment-service';
import './artwork-studio.css';

/*
 * The buyer's payment page for one confirmed order. It shows only the
 * payment details snapshotted onto this order when the artist confirmed it,
 * so a later change by the artist can never switch the payee here. The buyer
 * pays the artist directly in their own UPI app; the platform never touches
 * the money, and the artist alone confirms receipt from their own app.
 * Nothing on this page verifies that the QR or UPI ID belongs to the artist;
 * the buyer checks the name shown in their own app before paying.
 */

type OrderRow = {
  id: string;
  artwork_id: string;
  amount_inr: number;
  delivery_fee_inr: number;
  status: string;
  payment_state: PaymentState;
  qr_path_snapshot: string;
  upi_id_snapshot: string;
  payee_name_snapshot: string;
};

const rupees = (n: number): string => '₹' + n.toLocaleString('en-IN');

export function OrderPayPage() {
  const {id} = useParams<{id: string}>();
  const client = configuredAccountClient();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [work, setWork] = useState<SharedArtwork | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'denied'>('loading');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const alive = useRef(true);

  const load = async () => {
    if (!client || !id) {setState('denied'); return;}
    const {data: session} = await client.auth.getSession();
    if (!session.session) {if (alive.current) setState('denied'); return;}
    const {data, error} = await client.from('order_requests').select('id,artwork_id,amount_inr,delivery_fee_inr,status,payment_state,qr_path_snapshot,upi_id_snapshot,payee_name_snapshot').eq('id', id).maybeSingle();
    if (!alive.current) return;
    if (error) {setMessage(error.message); setState('error'); return;}
    const row = data as OrderRow | null;
    if (!row || row.status !== 'confirmed') {setState('denied'); return;}
    setOrder(row);
    const {data: found} = await client.rpc('published_artwork_by_prefix', {p_prefix: row.artwork_id.slice(0, 8)});
    if (!alive.current) return;
    setWork((((found ?? []) as SharedArtwork[]).filter(w => w.id === row.artwork_id)[0]) ?? null);
    if (row.qr_path_snapshot) {
      try {
        const url = await paymentQrUrl(client, row.qr_path_snapshot);
        if (alive.current) setQrUrl(url);
      } catch { /* the UPI ID below still lets the buyer pay */ }
    }
    setState('ready');
  };

  useEffect(() => {
    alive.current = true;
    load().catch(e => {if (alive.current) {setMessage(e instanceof Error ? e.message : 'Could not open this order.'); setState('error');}});
    return () => {alive.current = false;};
  }, [id]);

  const copy = async (label: string, value: string) => {
    try {await navigator.clipboard.writeText(value); setCopied(label); setTimeout(() => alive.current && setCopied(''), 2000);} catch {setCopied('');}
  };

  const paid = async () => {
    if (!client || !order || busy) return;
    setBusy(true); setMessage('');
    try {
      await markOrderPaid(client, order.id);
      if (alive.current) setOrder({...order, payment_state: 'buyer_marked'});
    } catch (e) {if (alive.current) setMessage(e instanceof Error ? e.message : 'Could not mark this order. Retry.');}
    finally {if (alive.current) setBusy(false);}
  };

  const total = order ? order.amount_inr + order.delivery_fee_inr : 0;
  const hasDetails = Boolean(order && (order.qr_path_snapshot || order.upi_id_snapshot));

  return <main className="artwork-workspace">
    <header className="workspace-nav"><Link to="/">elusive · hue</Link><Link to="/orders">My orders ↗</Link></header>
    <section className="workspace-body">
      <p className="kicker">Payment for this order</p>
      <h1 className="display">Pay the artist.</h1>
      {state === 'loading' && <WaitOrb label="Opening your order"/>}
      {state === 'denied' && <div className="workspace-empty"><p>This payment page is only for an order of yours that the artist has accepted.</p><Link to="/orders">Back to my orders ↗</Link></div>}
      {state === 'error' && <p role="alert">{message}</p>}
      {state === 'ready' && order && <>
        <p className="workspace-intro">{work ? work.title : 'Your order'} · {order.delivery_fee_inr > 0 ? `${rupees(order.amount_inr)} + ${rupees(order.delivery_fee_inr)} delivery = ${rupees(total)}` : rupees(total)}. You pay the artist directly in your UPI app; nothing is charged here.</p>
        {!hasDetails ? <div className="workspace-empty"><p>The artist has not added their payment details yet. They have your contact details from accepting the order, so you can also reach them directly.</p></div> : <>
          {qrUrl && <p><img src={qrUrl} alt="Artist's UPI QR for this order" style={{maxWidth: 280, width: '100%', borderRadius: 12, background: '#fff', padding: 8}}/></p>}
          {order.upi_id_snapshot && <p className="offer-note">UPI ID: <strong>{order.upi_id_snapshot}</strong>{' '}<button type="button" className="pay-copy" onClick={() => void copy('upi', order.upi_id_snapshot)}>{copied === 'upi' ? 'Copied' : 'Copy'}</button></p>}
          {order.payee_name_snapshot && <p className="offer-note">Payee name: <strong>{order.payee_name_snapshot}</strong>{' '}<button type="button" className="pay-copy" onClick={() => void copy('payee', order.payee_name_snapshot)}>{copied === 'payee' ? 'Copied' : 'Copy'}</button></p>}
          <p className="offer-note">Paying on the same phone? Open your UPI app and pay the UPI ID above as a new payment of {rupees(total)}.</p>
          <p className="offer-note"><strong>Check the name shown in your app matches the artist before you pay.</strong> Pay only the details shown here, inside your order - never a code sent over chat.</p>
          {order.payment_state === 'received' ? <p className="offer-note"><strong>Payment received.</strong> The artist confirmed {rupees(total)} from their own app. Your order is placed.</p>
            : order.payment_state === 'buyer_marked' ? <p className="offer-note" role="status">The artist is checking their UPI app for your {rupees(total)}. This updates when they answer.</p>
            : <>
              {order.payment_state === 'missing' && <p className="offer-note" role="alert">The artist could not find this payment in their app yet. Keep your receipt and check that you paid the exact details above, then mark it again once it lands.</p>}
              <p className="pay-actions"><button className="pay-primary" type="button" disabled={busy} onClick={() => void paid()}>{busy ? 'Marking...' : 'I have paid'} <span>↗</span></button></p>
            </>}
          <p className="offer-note">For payment issues, contact the artist. Keep your receipt; this page does not define refund or complaint policies.</p>
        </>}
      </>}
      {message && state === 'ready' && <p role="alert">{message}</p>}
    </section>
    <footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>
  </main>;
}
