import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {configuredAccountClient,accountRepository,type Artwork} from './account-service';
import {artworkParam} from './public-service';
import {prepareArtworkPhoto,saveArtworkDraft,newDraftAttempt,discardUnconfirmedPhoto,ownArtworkPreviews,type DraftDetails} from './artwork-drafts';
import {offersForArtworks,respondOffer,type Offer} from './offers-service';
import {artistOrderRequests,respondOrderRequest,type ArtistOrderRequest} from './orders-service';
import './artwork-studio.css';

export function ArtworkStudio({onClose,onSaved}:{onClose:()=>void;onSaved:(artwork:Artwork)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),attempt=useRef(newDraftAttempt());
 const [photo,setPhoto]=useState<File|null>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(false);
 const [title,setTitle]=useState(''),[medium,setMedium]=useState(''),[format,setFormat]=useState<'Physical'|'Digital'>('Physical'),[size,setSize]=useState<'Small'|'Medium'|'Large'>('Medium'),[width,setWidth]=useState(''),[height,setHeight]=useState(''),[price,setPrice]=useState(''),[descr,setDescr]=useState('');
 const client=configuredAccountClient();
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{dialog.current?.close();previous?.focus();};},[]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 useEffect(()=>{if(!busy&&!attempt.current.path)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[busy,error]);
 const close=async()=>{if(busy)return;setBusy(true);try{if(client)await discardUnconfirmedPhoto(client,attempt.current);onClose();}catch(e){setError(e instanceof Error?e.message:'Could not check unfinished photo. Retry.');}finally{setBusy(false);}};
 const pick=async(file?:File)=>{if(!file||busy)return;setBusy(true);setError('');try{const prepared=await prepareArtworkPhoto(file);setPhoto(prepared);setUrl(URL.createObjectURL(prepared));}catch(e){setError(e instanceof Error?e.message:'Could not open photo.');}finally{setBusy(false);}};
 const details=():DraftDetails=>({title,medium,format,size_class:size,width:Number(width),height:Number(height),unit:format==='Physical'?'cm':'px',asking_price_inr:Number(price),description:descr});
 const validate=()=>{if(!photo)return 'Choose an artwork photo.';if(!title.trim()||!medium.trim())return 'Add the artwork title and art medium.';if(!/^\d+(\.\d{1,2})?$/.test(width)||!/^\d+(\.\d{1,2})?$/.test(height)||Number(width)<=0||Number(height)<=0||Number(width)>100000||Number(height)>100000)return 'Use dimensions above zero, up to 100,000, with at most two decimal places.';if(format==='Digital'&&(!/^\d+$/.test(width)||!/^\d+$/.test(height)))return 'Use whole pixels for digital dimensions.';if(!/^\d+$/.test(price)||Number(price)<1||Number(price)>10000000)return 'Use a whole-rupee price from ₹1 to ₹1,00,00,000.';return '';};
 const save=async()=>{if(busy||!client||!photo)return;const invalid=validate();if(invalid){setError(invalid);return;}setBusy(true);setError('');try{const saved=await saveArtworkDraft(client,photo,details(),attempt.current);attempt.current.path='';onSaved(saved);}catch(e){setError(e instanceof Error?e.message:'Could not save. Retry when connected.');}finally{setBusy(false);}};
 return <dialog ref={dialog} className="listing-dialog saved-studio" aria-label="Save artwork draft" onCancel={e=>{e.preventDefault();void close();}}><div className="listing-shell" aria-busy={busy}>
  <div className="listing-top"><span className="kicker">Elusive Hue / Artist studio</span><button type="button" disabled={busy} onClick={()=>void close()}>Close ×</button></div>
  <header className="listing-heading"><p className="kicker">{preview?'02 / Private preview':'01 / Your artwork'}</p><h2 className="display">{preview?'Ready for your space.':'Make room for your work.'}</h2><p>A private draft, saved to your account. Nothing is published or offered for sale.</p></header>
  <p className="listing-notice">We save one web-sized preview photo, up to 1600 px. Your original file stays with you. JPG, PNG or WebP input up to 8 MB.</p>
  {error&&<p className="listing-error" role="alert">{error}</p>}
  {preview?<section className="listing-preview"><div className="listing-image"><img src={url} alt={title}/></div><div className="listing-preview-copy"><span className="kicker">Private draft / {format}</span><h3 className="display">{title}</h3><p className="listing-asking">₹{Number(price).toLocaleString('en-IN')}<span>Planned asking price · not for sale</span></p><dl><div><dt>Art medium</dt><dd>{medium}</dd></div><div><dt>Size class</dt><dd>{size}</dd></div><div><dt>Width × height</dt><dd>{width} × {height} {format==='Physical'?'cm':'px'}</dd></div></dl><button type="button" className="listing-primary" disabled={busy||!client} onClick={()=>void save()}>{busy?'Saving draft...':'Save private draft ↗'}</button><button type="button" disabled={busy||Boolean(attempt.current.path)} onClick={()=>setPreview(false)}>Edit details</button><p className="listing-small">Only your account can open this draft. No public listing, purchase or payment is created.</p></div></section>:<form className="listing-form" onSubmit={e=>{e.preventDefault();const message=validate();setError(message);if(!message){setPreview(true);dialog.current?.scrollTo({top:0});}}}>
   <div className="listing-photo-panel"><div className={`listing-image${photo?'':' empty'}`}>{photo?<img src={url} alt="Your artwork preview"/>:<div><span aria-hidden="true">＋</span><p>Your artwork goes here.</p><small>One preview photo. No duplicate originals.</small></div>}</div><label className="listing-file">{busy?'Preparing photo...':'Choose a photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>void pick(e.target.files?.[0])}/></label>{photo&&<p className="listing-small">Preview ready · {Math.ceil(photo.size/1024)} KB</p>}</div>
   <fieldset className="listing-fields" disabled={busy}><label>Artwork title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} required placeholder="Give your piece a name"/></label><div className="listing-field-row"><label>Format<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option>Physical</option><option>Digital</option></select></label><label>Size class<select value={size} onChange={e=>setSize(e.target.value as typeof size)}><option>Small</option><option>Medium</option><option>Large</option></select></label></div><label>Art medium<input value={medium} onChange={e=>setMedium(e.target.value)} required maxLength={100} placeholder="e.g. Oil on canvas"/></label><div className="listing-field-row"><label>Width · {format==='Physical'?'cm':'px'}<input inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)} required maxLength={9}/></label><label>Height · {format==='Physical'?'cm':'px'}<input inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)} required maxLength={9}/></label></div><label>Planned asking price · INR<input inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)} required maxLength={8} placeholder="Whole rupees"/></label><label>Description · optional<textarea value={descr} onChange={e=>setDescr(e.target.value)} maxLength={1000} rows={3} placeholder="A few words about the piece. Buyers read this when you list it for sale."/></label><button type="submit" className="listing-primary">Preview draft ↗</button><p className="listing-small">Preview first. Upload starts only when you choose Save private draft.</p></fieldset>
  </form>}
 </div></dialog>;
}

type Preview=Awaited<ReturnType<typeof ownArtworkPreviews>>[number];
function SharePublic({client,artwork,onChanged}:{client:NonNullable<ReturnType<typeof configuredAccountClient>>;artwork:Artwork;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const published=artwork.status==='published';
 const toggle=async()=>{if(busy)return;setBusy(true);setMessage('');try{await accountRepository(client).setStatus(artwork.id,published?'draft':'published');onChanged();}catch(e){setMessage(e instanceof Error?e.message:'Could not update sharing. Retry when connected.');}finally{setBusy(false);}};
 return <div className="share-public">
  <p>{published?'Shared publicly. Anyone with the link can see this artwork and your public artist profile.':'Private. Only your account can open this artwork.'}</p>
  <div className="share-public-actions"><button type="button" disabled={busy} onClick={()=>void toggle()}>{busy?'Updating...':published?'Make private':'Share publicly ↗'}</button>{published&&<Link to={`/artwork/${artworkParam(artwork)}`}>Open public page ↗</Link>}</div>
  {message&&<p role="alert">{message}</p>}
 </div>;
}


function OfferRow({client,offer,onChanged}:{client:NonNullable<ReturnType<typeof configuredAccountClient>>;offer:Offer;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[counter,setCounter]=useState('');
 const open=offer.status==='pending'||offer.status==='countered';
 const respond=async(action:'accept'|'decline'|'counter')=>{if(busy)return;setBusy(true);setMessage('');try{await respondOffer(client,offer.id,action,action==='counter'?Number(counter):undefined);onChanged();}catch(e){setMessage(e instanceof Error?e.message:'Could not answer this offer. Retry when connected.');}finally{setBusy(false);}};
 return <li className="offer-row">
  <div className="offer-row-top"><strong>₹{offer.amount_inr.toLocaleString('en-IN')}</strong><span className={`offer-status offer-status-${offer.status}`}>{offer.status==='countered'&&offer.counter_amount_inr?`Countered ₹${offer.counter_amount_inr.toLocaleString('en-IN')}`:offer.status[0].toUpperCase()+offer.status.slice(1)}</span></div>
  {offer.note&&<p className="offer-note">{offer.note}</p>}
  <p className="offer-time">A buyer · {new Date(offer.created_at).toLocaleDateString('en-IN')}</p>
  {open&&<div className="offer-respond"><div className="offer-respond-actions"><button type="button" disabled={busy} onClick={()=>void respond('accept')}>Accept</button><button type="button" disabled={busy} onClick={()=>void respond('decline')}>Decline</button></div><div className="offer-counter-row"><input inputMode="numeric" maxLength={8} placeholder="Counter · INR" value={counter} onChange={e=>setCounter(e.target.value)} disabled={busy}/><button type="button" disabled={busy||!counter} onClick={()=>void respond('counter')}>Send counter</button></div></div>}
  {message&&<p role="alert">{message}</p>}
 </li>;
}

function OrderRequestRow({client,req,onChanged}:{client:NonNullable<ReturnType<typeof configuredAccountClient>>;req:ArtistOrderRequest;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const answer=async(action:'confirm'|'decline')=>{if(busy)return;setBusy(true);setMessage('');try{await respondOrderRequest(client,req.id,action);onChanged();}catch(e){setMessage(e instanceof Error?e.message:'Could not answer this request. Retry when connected.');}finally{setBusy(false);}};
 const confirmed=req.status==='confirmed';
 return <li className="offer-row">
  <div className="offer-row-top"><strong>₹{(req.amount_inr+req.delivery_fee_inr).toLocaleString('en-IN')}</strong><span className={`offer-status offer-status-${req.status}`}>{req.status[0].toUpperCase()+req.status.slice(1)}</span></div>
  {req.delivery_fee_inr>0&&<p className="offer-time">₹{req.amount_inr.toLocaleString('en-IN')} + ₹{req.delivery_fee_inr.toLocaleString('en-IN')} delivery</p>}
  {confirmed?<p className="offer-note">{req.buyer_name}{req.buyer_phone?` · ${req.buyer_phone}`:''}{req.buyer_email?` · ${req.buyer_email}`:''}{req.delivery_address?<><br/>{req.delivery_address}{req.delivery_pin?` · ${req.delivery_pin}`:''}</>:null}</p>:<p className="offer-note">{req.first_name}{req.area?` · area ${req.area}`:''}. Full contact details appear after you confirm.</p>}
  <p className="offer-time">{new Date(req.created_at).toLocaleDateString('en-IN')}</p>
  {req.status==='pending'&&<div className="offer-respond"><div className="offer-respond-actions"><button type="button" disabled={busy} onClick={()=>void answer('confirm')}>Confirm</button><button type="button" disabled={busy} onClick={()=>void answer('decline')}>Decline</button></div></div>}
  {message&&<p role="alert">{message}</p>}
 </li>;
}

function SellingPanel({client,artwork,onChanged}:{client:NonNullable<ReturnType<typeof configuredAccountClient>>;artwork:Artwork;onChanged:()=>void}){
 const [descr,setDescr]=useState(artwork.description),[forSale,setForSale]=useState(artwork.for_sale),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[savedTick,setSavedTick]=useState(false);
 const [offers,setOffers]=useState<Offer[]|null>(null),[orders,setOrders]=useState<ArtistOrderRequest[]|null>(null);
 const loadOrders=async()=>{try{setOrders(await artistOrderRequests(client,[artwork.id]));}catch{setOrders([]);}};
 useEffect(()=>{if(artwork.status==='published')void loadOrders();},[client,artwork.id,artwork.status,artwork.updated_at]);
 const [fee,setFee]=useState(String(artwork.delivery_fee_inr??0));
 const feeNum=/^\d{1,6}$/.test(fee)?Number(fee):NaN;
 const dirty=descr!==artwork.description||forSale!==artwork.for_sale||(feeNum!==(artwork.delivery_fee_inr??0));
 const loadOffers=async()=>{try{setOffers(await offersForArtworks(client,[artwork.id]));}catch{setOffers([]);}};
 useEffect(()=>{if(artwork.status==='published')void loadOffers();},[client,artwork.id,artwork.status,artwork.updated_at]);
 const save=async()=>{if(busy||!dirty)return;setBusy(true);setMessage('');setSavedTick(false);try{if(artwork.format==='Physical'&&Number.isNaN(feeNum))throw new Error('Use a whole-rupee delivery fee from 0 to 100,000.');if(descr!==artwork.description||forSale!==artwork.for_sale)await accountRepository(client).setSelling(artwork.id,descr,forSale);if(feeNum!==(artwork.delivery_fee_inr??0))await accountRepository(client).setDeliveryFee(artwork.id,feeNum);setSavedTick(true);onChanged();}catch(e){setMessage(e instanceof Error?e.message:'Could not save selling details. Retry when connected.');}finally{setBusy(false);}};
 return <section className="selling-panel" aria-label="Selling settings">
  <p className="selling-kicker">Selling</p>
  <label className="selling-descr">Description buyers read<textarea value={descr} onChange={e=>setDescr(e.target.value)} maxLength={1000} rows={3} disabled={busy} placeholder="A few words about the piece - story, materials, condition."/></label>
  <div className="selling-row"><button type="button" className={forSale?'selling-toggle on':'selling-toggle'} aria-pressed={forSale} disabled={busy} onClick={()=>setForSale(!forSale)}>{forSale?'Listed for sale':'Not for sale'}</button><p>{forSale?'Buyers see your price and can make offers. When you confirm an order, the buyer pays you directly by UPI.':'Your price stays a plan. Nothing is offered to buyers.'}</p></div>
  {artwork.format==='Physical'&&<label className="selling-descr">Delivery fee (₹, you set it; 0 for none)<input value={fee} onChange={e=>setFee(e.target.value)} inputMode="numeric" maxLength={6} disabled={busy}/><small>Buyers see price + this fee as one total before they send a request. You book the courier yourself.</small></label>}
  {dirty&&<button type="button" className="selling-save" disabled={busy} onClick={()=>void save()}>{busy?'Saving...':'Save selling details ↗'}</button>}
  {savedTick&&!dirty&&<p role="status">Selling details saved.</p>}
  {message&&<p role="alert">{message}</p>}
  {artwork.status==='published'&&<div className="selling-offers"><p className="selling-kicker">Order requests</p>{orders===null?<p role="status">Loading requests...</p>:orders.length===0?<p>No order requests yet. Requests from buyers appear here for you to confirm or decline.</p>:<ul>{orders.map(r=><OrderRequestRow key={r.id} client={client} req={r} onChanged={()=>{void loadOrders();}}/>)}</ul>}</div>}{artwork.status==='published'&&<div className="selling-offers"><p className="selling-kicker">Offers on this artwork</p>{offers===null?<p role="status">Loading offers...</p>:offers.length===0?<p>No offers yet. Offers buyers make will appear here.</p>:<ul>{offers.map(o=><OfferRow key={o.id} client={client} offer={o} onChanged={()=>{void loadOffers();}}/>)}</ul>}</div>}
 </section>;
}

export function MyArtworks(){
 const client=configuredAccountClient();
 const [session,setSession]=useState<boolean|null>(client?null:false),[items,setItems]=useState<Preview[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[studio,setStudio]=useState(false);
 const mounted=useRef(true),request=useRef(0);
 const reload=async()=>{if(!client)return;const id=++request.current;setLoading(true);setError('');try{const next=await ownArtworkPreviews(client);if(mounted.current&&id===request.current)setItems(next);}catch(e){if(mounted.current&&id===request.current)setError(e instanceof Error?e.message:'Could not load artwork drafts.');}finally{if(mounted.current&&id===request.current)setLoading(false);}};
 useEffect(()=>{mounted.current=true;if(!client){setLoading(false);return;}client.auth.getSession().then(({data})=>{if(!mounted.current)return;setSession(Boolean(data.session));if(data.session)void reload();else setLoading(false);}).catch(()=>{if(mounted.current){setSession(false);setLoading(false);setError('Could not check your account. Reopen this page when connected.');}});const {data}=client.auth.onAuthStateChange((_event,next)=>{if(!next){request.current++;setSession(false);setItems([]);setStudio(false);setLoading(false);}});return()=>{mounted.current=false;request.current++;data.subscription.unsubscribe();};},[client]);
 return <main className="artwork-workspace"><header className="workspace-nav"><Link to="/">elusive · hue</Link><Link to="/account">Your account ↗</Link></header><section className="workspace-body"><p className="kicker">Your private collection</p><h1 className="display">My artworks.</h1><p className="workspace-intro">Photo and details, kept in your account. Nothing is public unless you share it.</p>
  {session===false?<div className="workspace-empty">{error&&<p role="alert">{error}</p>}<p>{client?'Sign in to save and open your artwork drafts.':'Saving needs the connected account setup. The gallery remains available to browse.'}</p><Link to="/account">Go to sign in ↗</Link></div>:<><div className="workspace-actions"><button className="gallery-cta" disabled={session===null||loading} onClick={()=>{setNotice('');setStudio(true);}}>Add an artwork ↗</button><button disabled={loading||session===null} onClick={()=>void reload()}>Refresh drafts</button></div>{notice&&<p role="status">{notice}</p>}{error&&<p className="listing-error" role="alert">{error}</p>}{loading?<p role="status">Loading your artworks...</p>:items.length===0&&!error?<div className="workspace-empty"><h2>Room for your first piece.</h2><p>Add a photo and a few details, then save a private draft.</p></div>:<div className="saved-artwork-grid">{items.map(({artwork:a,url,photoError})=><details key={a.id} className="saved-artwork" open={new URLSearchParams(location.hash.split('?')[1]||'').get('id')===a.id}><summary><div className="saved-artwork-photo">{url?<img src={url} alt={a.title} loading="lazy" onError={e=>{e.currentTarget.hidden=true;e.currentTarget.parentElement?.classList.add('photo-expired');}}/>:<span>{photoError?'Photo unavailable. Refresh to retry.':'No preview'}</span>}<span className="photo-refresh-note">Photo link expired. Use Refresh drafts.</span></div><span className="saved-artwork-title">{a.title}</span><span className="saved-artwork-status">{a.status==='draft'?'Private draft':'Published'} · Open details ↗</span></summary><dl><div><dt>Art medium</dt><dd>{a.medium}</dd></div><div><dt>Format / size</dt><dd>{a.format} / {a.size_class}</dd></div><div><dt>Dimensions</dt><dd>{a.width} × {a.height} {a.unit}</dd></div><div><dt>Planned asking price</dt><dd>₹{a.asking_price_inr.toLocaleString('en-IN')}</dd></div></dl><p>Saved {new Date(a.created_at).toLocaleDateString('en-IN')}. {a.for_sale?'Listed for sale.':'Not offered for sale.'}</p>{client&&<SharePublic client={client} artwork={a} onChanged={()=>void reload()}/>}{client&&<SellingPanel client={client} artwork={a} onChanged={()=>void reload()}/>}</details>)}</div>}{items.length>=50&&<p>Showing your latest 50 artworks.</p>}</>}
 </section><footer className="workspace-footer"><a href="https://github.com/himanshuurawat" target="_blank" rel="noopener noreferrer">Developed by Himanshu Rawat ↗</a></footer>{studio&&client&&<ArtworkStudio onClose={()=>setStudio(false)} onSaved={()=>{setStudio(false);setNotice('Private draft saved. Your photo and details are in My artworks.');void reload();}}/>}</main>;
}
