import React,{useEffect,useRef,useState} from 'react';
import {WaitOrb} from './PublicPages';
import {Link,useNavigate} from 'react-router-dom';
import {accountRepository,authReturnUrl,type ProfileFields} from './account-service';
import {myPaymentDetails,paymentQrUrl,savePaymentDetails,uploadPaymentQr} from './payment-service';
import {artContour,artFigure} from './artwork';
import type {SupabaseClient} from '@supabase/supabase-js';
import './profile-glass.css';

type Tab='profile'|'security'|'payments';

/*
 * The artist's own UPI details for direct payment (backend/006). Only the
 * artist can read or change these. When the artist confirms an order, a copy
 * is snapshotted onto that order; changing details here never alters an
 * already-confirmed order. Nothing here verifies ownership of the QR or UPI
 * ID, and buyers are told to check the name in their own app before paying.
 */
function PaymentsPanel({client}:{client:SupabaseClient}){
 const [upiId,setUpiId]=useState(''),[payeeName,setPayeeName]=useState(''),[qrPath,setQrPath]=useState(''),[qrVersion,setQrVersion]=useState(0),[qrPreview,setQrPreview]=useState(''),[file,setFile]=useState<File|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[note,setNote]=useState('');
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;myPaymentDetails(client).then(async d=>{if(!alive.current)return;if(d){setUpiId(d.upi_id);setPayeeName(d.payee_name);setQrPath(d.qr_path);setQrVersion(d.qr_version);if(d.qr_path){try{setQrPreview(await paymentQrUrl(client,d.qr_path));}catch{/* preview only */}}}}).catch(e=>{if(alive.current)setNote(e instanceof Error?e.message:'Could not load your payment details.');}).finally(()=>{if(alive.current)setLoading(false);});return()=>{alive.current=false;};},[client]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setNote('');
  try{
   let path=qrPath;
   if(file){path=await uploadPaymentQr(client,file,qrVersion+1);}
   if(!path&&!upiId.trim())throw new Error('Add a QR image or your UPI ID - buyers need at least one to pay you.');
   await savePaymentDetails(client,upiId.trim(),payeeName.trim(),path);
   if(!alive.current)return;
   if(file){setQrVersion(v=>v+1);setQrPath(path);try{setQrPreview(await paymentQrUrl(client,path));}catch{/* preview only */}setFile(null);}
   setNote('Payment details saved. Only orders you confirm after this will use them.');
  }catch(err){if(alive.current)setNote(err instanceof Error?err.message:'Could not save. Retry.');}
  finally{if(alive.current)setBusy(false);}};
 if(loading)return <div className="profile-loading"><WaitOrb label="Loading your payment details"/></div>;
 return <form className="profile-details" onSubmit={save}><fieldset disabled={busy}>
  <p className="kicker">GET PAID DIRECTLY</p>
  <h3>Your UPI details.</h3>
  <p>Buyers pay you straight to your UPI account when you confirm their order. Elusive Hue never receives or holds this money. Your details stay private until you confirm an order, and each confirmed order keeps its own copy - changing these later never changes an order you already confirmed.</p>
  <label>UPI ID<input autoComplete="off" value={upiId} onChange={e=>setUpiId(e.target.value)} maxLength={60} placeholder="yourname@bank"/></label>
  <label>Payee name<input autoComplete="name" value={payeeName} onChange={e=>setPayeeName(e.target.value)} maxLength={80} placeholder="The name buyers should see in their app"/></label>
  <label>Payment QR <span className="profile-optional">image</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
  {qrPreview&&<p><img src={qrPreview} alt="Your current payment QR" style={{maxWidth:180,borderRadius:12,background:'#fff',padding:8}}/></p>}
  <small>Uploading a new image never overwrites the old one; orders that already show a QR keep showing theirs.</small>
  <div className="profile-save-row"><p>Buyers are asked to check the name in their own app before paying. You confirm every payment from your own UPI app.</p><button className="profile-save" type="submit">{busy?<><WaitOrb inline size={22} delay={250} label="Saving payment details"/>Saving</>:'Save payment details'} <span>↗</span></button></div>
  {note&&<p className="profile-feedback" role="status">{note}</p>}
 </fieldset></form>;
}
export function ProfilePanel({client,onSignOut}:{client:SupabaseClient;onSignOut:()=>void}){
 const navigate=useNavigate();
 const [profile,setProfile]=useState<ProfileFields>({username:'',display_name:'',bio:''}),[saved,setSaved]=useState<ProfileFields|null>(null),[tab,setTab]=useState<Tab>('profile'),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[recoverySent,setRecoverySent]=useState(false);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;Promise.all([accountRepository(client).profile(),client.auth.getUser()]).then(([p,u])=>{if(!alive.current)return;if(u.error)throw u.error;if(!u.data.user)throw new Error('Your session has ended. Sign in again.');const value=p||{username:u.data.user.user_metadata?.username||'',display_name:'',bio:''};setProfile(value);setSaved(value);}).catch(e=>{if(alive.current)setMessage(e.message);}).finally(()=>{if(alive.current)setLoading(false);});return()=>{alive.current=false;};},[client]);
 const name=saved?.display_name||saved?.username||'Your space',initials=name==='Your space'?'EH':name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{const p=await accountRepository(client).saveProfile(profile);setSaved(p);setProfile(p);setMessage('Profile saved.');if(alive.current)navigate('/');}catch(e){setMessage(e instanceof Error?e.message:'Could not save your profile.');setBusy(false);}};
 const signOut=async()=>{setBusy(true);setMessage('');try{const {error}=await client.auth.signOut();if(error)throw error;onSignOut();}catch(e){setMessage(e instanceof Error?e.message:'Could not sign out.');setBusy(false);}};
 const tabKeys=(e:React.KeyboardEvent<HTMLDivElement>)=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const order:Tab[]=['profile','security','payments'];const i=order.indexOf(tab);const next=e.key==='Home'?'profile':e.key==='End'?'payments':e.key==='ArrowRight'?order[(i+1)%order.length]:order[(i+order.length-1)%order.length];setTab(next);setMessage('');document.getElementById(next+'-tab')?.focus();};
 const recover=async()=>{if(busy||recoverySent)return;setBusy(true);setMessage('');try{const {data,error}=await client.auth.getUser();if(error)throw error;if(!data.user?.email)throw new Error('No email is available for password recovery on this account.');const {error:sendError}=await client.auth.resetPasswordForEmail(data.user.email,{redirectTo:authReturnUrl(true)});if(sendError)throw sendError;setRecoverySent(true);setMessage('Password reset link requested. Check your account email and open it in this browser.');}catch(e){setMessage(e instanceof Error?e.message:'Could not request a reset link.');}finally{setBusy(false);}};
 return <main className="profile-space"><div className="profile-scene" aria-hidden="true"><img className="profile-landscape" src={artContour} alt=""/><div className="profile-backdrop-shade"/><img className="profile-standing-art" src={artFigure} alt=""/><span className="profile-scene-label">A DIFFERENT PERSPECTIVE / YOUR OWN</span></div>
  <svg width="0" height="0" className="profile-filter" aria-hidden="true"><defs><filter id="profile-liquid-lens" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.009 0.018" numOctaves="2" seed="7" result="glassNoise"/><feGaussianBlur in="glassNoise" stdDeviation="2" result="glassMap"/><feDisplacementMap in="SourceGraphic" in2="glassMap" scale="18" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="1.2"/></filter></defs></svg>
  <nav className="profile-topbar"><Link className="profile-wordmark" to="/">elusive · hue</Link><Link className="profile-back" to="/">Back to collection <span>↗</span></Link></nav>
  <div className="profile-stage"><aside className="profile-editorial"><p className="kicker">YOUR OWN CORNER</p><h1 className="display">A little<br/>{' '}more <i>you.</i></h1><p>The art you love.<br/>The work you make.<br/>One place to call your own.</p><span className="profile-editorial-foot">LOOK. COLLECT. CREATE.</span></aside>
   <section className="profile-lens" aria-label="Your account settings"><div className="profile-lens-refraction" aria-hidden="true"><img src={artContour} alt=""/></div><div className="profile-lens-edge" aria-hidden="true"/><div className="profile-lens-content">
    <header className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials}</div><div><p className="kicker">YOUR ACCOUNT</p><h2>{loading?'Opening your space...':name}</h2><p>{saved?.username?'@'+saved.username:'Choose your artist name'}</p></div><span className="profile-private">Private</span></header>
    <div className="profile-tabs" role="tablist" aria-label="Account settings" onKeyDown={tabKeys}><button type="button" role="tab" tabIndex={tab==='profile'?0:-1} aria-selected={tab==='profile'} aria-controls="profile-settings-content" id="profile-tab" onClick={()=>{setTab('profile');setMessage('');}}>Profile</button><button type="button" role="tab" tabIndex={tab==='security'?0:-1} aria-selected={tab==='security'} aria-controls="security-settings-content" id="security-tab" onClick={()=>{setTab('security');setMessage('');}}>Security</button><button type="button" role="tab" tabIndex={tab==='payments'?0:-1} aria-selected={tab==='payments'} aria-controls="payments-settings-content" id="payments-tab" onClick={()=>{setTab('payments');setMessage('');}}>Payments</button></div>
    {loading?<div className="profile-loading"><WaitOrb label="Loading your profile"/></div>:tab==='profile'?<div key="profile" className="profile-tab-panel" id="profile-settings-content" role="tabpanel" aria-labelledby="profile-tab"><form className="profile-details" onSubmit={save}><fieldset disabled={busy||!saved}><label>Display name<input autoComplete="nickname" value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})} maxLength={80} placeholder="Your name"/></label><label>Username<div className="profile-username"><span aria-hidden="true">@</span><input autoComplete="username" value={profile.username||''} onChange={e=>setProfile({...profile,username:e.target.value})} pattern="[a-zA-Z0-9_]{3,24}" minLength={3} maxLength={24} placeholder="your_artist_name" required/></div><small>3-24 letters, numbers or underscores.</small></label><label>Bio <span className="profile-optional">optional</span><textarea value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} maxLength={500} rows={2} placeholder="A few words about you and your work."/></label><div className="profile-save-row"><p>Make it yours. You can update this later.</p><button className="profile-save" type="submit">{busy?<><WaitOrb inline size={22} delay={250} label="Saving profile"/>Saving</>:'Save profile'} <span>↗</span></button></div></fieldset></form></div>:tab==='security'?<div key="security" id="security-settings-content" role="tabpanel" aria-labelledby="security-tab" className="profile-security profile-tab-panel"><p className="kicker">KEEP YOUR SPACE YOURS</p><h3>Password & access.</h3><p>Request a secure reset link at your account email. Open it in this browser to choose a new password.</p><button className="profile-save" type="button" disabled={busy||recoverySent||!saved} onClick={()=>void recover()}>{busy?'Requesting...':recoverySent?'Reset link requested':'Send password reset link'} <span>↗</span></button><small>If you use Google, your Google password is managed by Google, not Elusive Hue.</small></div>:<div key="payments" id="payments-settings-content" role="tabpanel" aria-labelledby="payments-tab" className="profile-tab-panel"><PaymentsPanel client={client}/></div>}
    {message&&<p key={message} className="profile-feedback" role="status">{message}</p>}
    <div className="profile-destinations" aria-label="Your art and purchases"><Link to="/my-artworks"><span>My artworks</span><small>Open your private drafts</small><b aria-hidden="true">↗</b></Link><Link to="/orders"><span>My orders</span><small>Requests sent and received</small><b aria-hidden="true">↗</b></Link></div><div className="profile-tools profile-bottom-tools"><span>YOUR SPACE, YOUR WAY.</span><button className="profile-signout" type="button" disabled={busy} onClick={()=>void signOut()}>Sign out <span aria-hidden="true">↗</span></button></div>
   </div></section>
  </div><footer className="profile-credit"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a><div><a href="/privacy.html">Privacy policy</a><a href="/terms.html">Terms of use</a></div></footer>
 </main>;
}
