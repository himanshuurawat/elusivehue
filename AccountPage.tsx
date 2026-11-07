import React, {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {artFigure,artCollage,artContour} from './artwork';
import './account.css';
import {configuredAccountClient,authReturnUrl} from './account-service';
import {ProfilePanel} from './ProfilePanel';
import type {Session} from '@supabase/supabase-js';
const client=configuredAccountClient();
// Separate opt-in. Email auth must stay usable while Google is being staged.
const googleEnabled=Boolean(client)&&import.meta.env.VITE_ENABLE_GOOGLE_AUTH==='true';

type Mode='login'|'signup'|'reset'|'update';
export function AccountPage(){
 const [mode,setMode]=useState<Mode>('login');
 const [show,setShow]=useState(false);
 const [recovering,setRecovering]=useState(false);
 const [message,setMessage]=useState('');
 const [paused,setPaused]=useState(false);
 const [busy,setBusy]=useState(false);
 const [pulse,setPulse]=useState(0);
 const [pageRipples,setPageRipples]=useState<{id:number;x:number;y:number;size:number}[]>([]);
 const rippleId=useRef(0);
 const firstTap=useRef(false);
 const [surfaceWave,setSurfaceWave]=useState(false);
 const surface=useRef<HTMLDivElement>(null);
 const waveOrigin=useRef({x:0,y:0});
 const waveMap=useRef<SVGFEImageElement>(null);
 useEffect(()=>{if(!surfaceWave)return;const el=surface.current;if(!el)return;const rect=el.getBoundingClientRect(),origin=waveOrigin.current;const canvas=document.createElement('canvas');const n=256;canvas.width=n;canvas.height=n;const ctx=canvas.getContext('2d');if(!ctx)return;const image=ctx.createImageData(n,n);const maxRadius=Math.max(Math.hypot(origin.x,origin.y),Math.hypot(rect.width-origin.x,origin.y),Math.hypot(origin.x,rect.height-origin.y),Math.hypot(rect.width-origin.x,rect.height-origin.y));let frame=0;const start=performance.now();const draw=(now:number)=>{const t=Math.min(1,(now-start)/2600),radius=t*maxRadius*1.15,band=100;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const dx=x/n*rect.width-origin.x,dy=y/n*rect.height-origin.y,d=Math.hypot(dx,dy),z=d-radius;const envelope=Math.exp(-z*z/(band*band))*Math.sin(Math.PI*t);const shift=Math.sin(z/20)*envelope;const i=(y*n+x)*4;image.data[i]=128+Math.round(90*shift*dx/(d||1));image.data[i+1]=128+Math.round(90*shift*dy/(d||1));image.data[i+2]=Math.round(255*envelope);image.data[i+3]=255;}ctx.putImageData(image,0,0);waveMap.current?.setAttribute('href',canvas.toDataURL());if(t<1)frame=requestAnimationFrame(draw);else setSurfaceWave(false);};frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);},[surfaceWave]);
 const positionRipple=(input:HTMLInputElement)=>{const host=input.closest('label');if(!host)return;const style=getComputedStyle(input);const canvas=document.createElement('canvas');const context=canvas.getContext('2d');if(!context)return;context.font=style.font;const caret=input.selectionStart??input.value.length;const text=input.type==='password'?'•'.repeat(caret):input.value.slice(0,caret);const h=host.getBoundingClientRect(),r=input.getBoundingClientRect();const x=r.left-h.left+parseFloat(style.paddingLeft)+context.measureText(text).width-input.scrollLeft;host.style.setProperty('--ripple-x',Math.min(r.right-h.left-8,Math.max(r.left-h.left+8,x))+'px');host.style.setProperty('--ripple-y',(r.top-h.top+r.height/2)+'px');host.dataset.ripple=String((pulse%2)+1);setPulse(pulse+1);};
 const tapRipple=(e:React.PointerEvent<HTMLElement>)=>{if(paused||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;if(!firstTap.current){firstTap.current=true;const id=++rippleId.current,x=e.clientX,y=e.clientY;setPageRipples([{id,x,y,size:Math.max(Math.hypot(x,y),Math.hypot(innerWidth-x,y),Math.hypot(x,innerHeight-y),Math.hypot(innerWidth-x,innerHeight-y))*2.1}]);const bounds=surface.current?.getBoundingClientRect();waveOrigin.current={x:x-(bounds?.left||0),y:y-(bounds?.top||0)};setSurfaceWave(true);}const input=(e.target as HTMLElement).closest('input');if(input)requestAnimationFrame(()=>positionRipple(input));};
 const pulseField=(e:React.FormEvent<HTMLElement>)=>{const input=e.target as HTMLInputElement;if(input.tagName==='INPUT')positionRipple(input);};

 const [session,setSession]=useState<Session|null>(null);
 const [checking,setChecking]=useState(Boolean(client));
 useEffect(()=>{if(!client)return;let active=true;client.auth.getSession().then(({data,error})=>{if(!active)return;if(error)setMessage(error.message);setSession(data.session);setChecking(false);});const {data}=client.auth.onAuthStateChange((_event,next)=>{setSession(next);if(_event==='PASSWORD_RECOVERY'){setRecovering(true);setMode('update');}setChecking(false);});return()=>{active=false;data.subscription.unsubscribe();};},[]);
 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault();if(!client){setMessage('This is the design preview. Account creation and sign-in are not connected yet.');return;}
  const data=new FormData(e.currentTarget),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');setBusy(true);setMessage('');
  try{
   if(mode==='login'){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;}
   else {const redirect=authReturnUrl(mode==='reset');
    if(mode==='signup'){const {data:result,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{username:String(data.get('username')||'').trim()}}});if(error)throw error;if(!result.session)setMessage('Check your email for a confirmation link before signing in.');}
    else if(mode==='reset'){const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;setMessage('If this email has an account, a reset link is on its way. Open it in this same browser.');}
    else{if(!recovering||!session)throw new Error('Open a fresh password reset link first.');const {error}=await client.auth.updateUser({password});if(error)throw error;setRecovering(false);setMode('login');setMessage('Password updated.');}
   }
  }catch(error){setMessage(error instanceof Error?error.message:'Could not complete that request. Try again.');}finally{setBusy(false);}
 };
 const signInWithGoogle=async()=>{
  if(!client||!googleEnabled||busy||checking)return;
  setBusy(true);setMessage('');
  try{
   const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:authReturnUrl(),scopes:'openid email profile',queryParams:{prompt:'select_account'}}});
   if(error)throw error;
  }catch(error){setMessage(error instanceof Error?error.message:'Could not open Google sign-in. Try again.');}
  finally{setBusy(false);}
 };
 const name=useRef<HTMLInputElement>(null);
 const stage=useRef<HTMLDivElement>(null);
 useEffect(()=>{document.title='Your space | Elusive Hue';return()=>{document.title='Elusive Hue';};},[]);
 useEffect(()=>{setMessage('');setShow(false);},[mode]);
 useEffect(()=>{let frame=0;const update=()=>{frame=0;const el=stage.current;if(!el)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;el.style.setProperty('--spread',String(reduced?0:Math.min(1,Math.max(0,-el.getBoundingClientRect().top/320))));};const request=()=>{if(!frame)frame=requestAnimationFrame(update);};window.addEventListener('scroll',request,{passive:true});update();return()=>{window.removeEventListener('scroll',request);cancelAnimationFrame(frame);};},[]);
 const move=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--mx',String((e.clientX-r.left)/r.width-.5));e.currentTarget.style.setProperty('--my',String((e.clientY-r.top)/r.height-.5));};
 return <main onPointerDown={tapRipple} className={`account-page${paused?' art-paused':''}`}>
  <div className="page-water-ripples" aria-hidden="true">{pageRipples.map(r=><div key={r.id} className="page-water-drop" style={{left:r.x,top:r.y,width:r.size,height:r.size} as React.CSSProperties} onAnimationEnd={e=>{if(e.target===e.currentTarget)setPageRipples(previous=>previous.filter(item=>item.id!==r.id));}}><i/><i/><i/></div>)}</div>
  {surfaceWave&&<svg className="wave-filter-defs" aria-hidden="true"><defs><filter colorInterpolationFilters="sRGB" id="account-surface-water" x="-2%" y="-2%" width="104%" height="104%"><feImage ref={waveMap} result="water" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none"/><feGaussianBlur in="water" stdDeviation="8" result="smoothWater"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="softSource"/><feDisplacementMap in="softSource" in2="smoothWater" scale="6" xChannelSelector="R" yChannelSelector="G" result="bent"/><feGaussianBlur in="bent" stdDeviation="0.5" result="refracted"/><feColorMatrix in="smoothWater" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="bandMask"/><feComposite in="refracted" in2="bandMask" operator="in" result="crest"/><feComposite in="SourceGraphic" in2="bandMask" operator="out" result="still"/><feMerge><feMergeNode in="still"/><feMergeNode in="crest"/></feMerge></filter></defs></svg>}
  <div ref={surface} className={`account-surface${surfaceWave?' surface-wave-active':''}`}>
  <header className="account-nav"><Link to="/" className="account-logo" aria-label="Elusive Hue home">elusive<span>·</span>hue</Link><Link to="/">Back to the collection ↗</Link></header>
  <div className="account-layout">
   <section className="account-art" ref={stage} onPointerMove={move} onPointerLeave={e=>{e.currentTarget.style.setProperty('--mx','0');e.currentTarget.style.setProperty('--my','0');}} aria-label="Layered art composition">
    <span className="account-eyebrow">A space for a different perspective</span>
    <div className="account-art-title"><span>Make room</span><span>for <i>yourself.</i></span></div>
    <div className="account-cascade" aria-hidden="true"><div className="cascade-sheet sheet-back"><img src={artContour} alt=""/></div><div className="cascade-sheet sheet-middle"><img src={artCollage} alt=""/></div><div className="cascade-sheet sheet-front"><img src={artFigure} alt=""/><span>Stillness, with a little movement.</span></div></div>
    <div className="account-art-foot"><span>Look. Collect. Create.</span><button type="button" onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused?'Play motion':'Pause motion'} <span aria-hidden="true">{paused?'▷':'Ⅱ'}</span></button></div>
   </section>
   {session&&client&&!recovering?<ProfilePanel client={client} onSignOut={()=>setSession(null)}/>:<section className="account-form-panel account-flow-panel" aria-label="Your account"><div className="form-flow-wash" aria-hidden="true"><i/><i/><i/></div>
    <div className="account-mode" role="group" aria-label="Account action"><button type="button" aria-pressed={mode==='login'} disabled={recovering} onClick={()=>setMode('login')}>Sign in</button><button type="button" aria-pressed={mode==='signup'} disabled={recovering} onClick={()=>setMode('signup')}>Create account</button></div>
    <div className="account-heading"><p className="account-eyebrow">Your own corner of Elusive Hue</p><h1>{mode==='login'?<>Good to<br/><i>see you.</i></>:mode==='signup'?<>A new<br/><i>perspective.</i></>:mode==='update'?<>Make it<br/><i>yours again.</i></>:<>Back to<br/><i>your space.</i></>}</h1><p>{mode==='login'?'The art you love. The work you make. One account.':mode==='signup'?'One account for discovering art and sharing your own.':mode==='update'?'Choose a new password for your account.':'Get a link to choose a new password. Open it in the same browser.'}</p></div>
    <form key={mode} className="account-flow-form" onInput={pulseField} onSubmit={submit}>
     {mode==='signup'&&<label>Username<input ref={name} name="username" autoComplete="username" minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" placeholder="Your artist name" required/><small>3-24 letters, numbers or underscores.</small></label>}
     {mode!=='update'&&<label>Email<input type="text" inputMode="email" pattern="[^ @]+@[^ @]+" name="email" autoComplete={mode==='login'?'username':'email'} placeholder="you@example.com" required maxLength={254}/></label>}
     {mode!=='reset'&&<label htmlFor="account-password">Password<div className="account-password"><input id="account-password" aria-label="Password" type={show?'text':'password'} name="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='signup'||mode==='update'?8:undefined} maxLength={128} required placeholder={mode==='signup'||mode==='update'?'At least 8 characters':'Your password'}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label>}
     {mode==='login'&&<button type="button" className="account-forgot" onClick={()=>setMode('reset')}>Forgot password?</button>}
     <button className="account-submit" disabled={busy||checking} type="submit">{busy?'Please wait...':mode==='login'?'Sign in':mode==='signup'?'Create account':mode==='update'?'Update password':'Send reset link'} <span aria-hidden="true">↗</span></button>
     {message&&<p className="account-message" role="status">{message}</p>}
    </form>
    {mode!=='reset'&&mode!=='update'?<><div className="account-divider"><span/>or<span/></div><button className="account-google" type="button" disabled={!googleEnabled||busy||checking} onClick={signInWithGoogle}><span aria-hidden="true">G</span> Continue with Google</button>{!googleEnabled&&<p className="account-setup">Google sign-in is not connected yet.</p>}</>:<button className="account-back" type="button" disabled={recovering} onClick={()=>setMode('login')}>← Back to sign in</button>}
    {!client&&<p className="account-preview-note">Design preview only. Please don't enter a real password.<br/>Nothing is sent or saved.</p>}
   </section>}
  </div>
 </div>
 </main>;
}
