import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import '@google/model-viewer';
import {RESALE_ITEMS} from './resale-items';
import './resale-film.css';

type Viewer=HTMLElement&{loaded?:boolean};
export function ResaleFilm(){
 const item=RESALE_ITEMS[0];
 const root=useRef<HTMLElement>(null);const viewer=useRef<Viewer|null>(null);
 const [attempt,setAttempt]=useState(0);const [loaded,setLoaded]=useState(false);const [error,setError]=useState(false);
 const [free,setFree]=useState(false);const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [paused,pause]=useState(false);const [scene,setScene]=useState(0);const [photo,setPhoto]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(photo&&!dialog.current?.open)dialog.current?.showModal()},[photo]);
 const fixed=useRef(0);const current=useRef(0);const sceneRef=useRef(0);
 const span=useRef(1);
 const jump=useRef<{from:number;to:number;at:number}|null>(null);
 const swipe=useRef<{x:number;y:number;vertical:boolean}|null>(null);
 const off=reduced||paused;
 function swipeStart(e:React.TouchEvent<HTMLElement>){
  swipe.current=null;if(free||photo||e.touches.length!==1||(e.target as Element).closest('button,a,dialog'))return;
  const t=e.touches[0];swipe.current={x:t.clientX,y:t.clientY,vertical:false};
 }
 function swipeMove(e:React.TouchEvent<HTMLElement>){
  const g=swipe.current;if(!g)return;if(e.touches.length!==1){swipe.current=null;return}
  const t=e.touches[0];const dx=Math.abs(t.clientX-g.x),dy=Math.abs(t.clientY-g.y);
  if(dy>18&&dy>dx)g.vertical=true;
 }
 function swipeEnd(e:React.TouchEvent<HTMLElement>){
  const g=swipe.current;swipe.current=null;if(!g||g.vertical||free||photo||e.changedTouches.length!==1)return;
  const t=e.changedTouches[0],dx=t.clientX-g.x,dy=t.clientY-g.y;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.4)return;
  const n=Math.max(0,Math.min(2,sceneRef.current+(dx<0?1:-1)));if(n!==sceneRef.current)go(n);
 }
 useEffect(()=>{window.scrollTo(0,0);const mq=matchMedia('(prefers-reduced-motion: reduce)');const fn=()=>setReduced(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn)},[]);
 useEffect(()=>{const m=viewer.current;if(!m)return;const done=()=>setLoaded(true);const fail=()=>{setError(true);setLoaded(false)};m.addEventListener('load',done);m.addEventListener('error',fail);if(m.loaded)setLoaded(true);return()=>{m.removeEventListener('load',done);m.removeEventListener('error',fail)}},[error,attempt]);
 useEffect(()=>{
  const stop=()=>{jump.current=null};const key=(e:KeyboardEvent)=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))stop()};
  window.addEventListener('wheel',stop,{passive:true});window.addEventListener('touchstart',stop,{passive:true});window.addEventListener('keydown',key);
  return()=>{window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);window.removeEventListener('keydown',key)};
 },[]);
 useEffect(()=>{
  let frame=0;let alive=true;let last=-1;let stamp=performance.now();let ink=-1;
  const r=root.current;if(!r)return;
  const stage=r.querySelector<HTMLElement>('.rf-stage')!;
  const track=r.querySelector<HTMLElement>('.rf-scroll')!;
  const anchor=r.querySelector<HTMLElement>('.rf-object-anchor')!;
  const copies=[...r.querySelectorAll<HTMLElement>('.rf-copy')];
  const labels=[...r.querySelectorAll<HTMLElement>('.rf-scene-label')];
  const backdrops=[...r.querySelectorAll<HTMLElement>('.rf-backdrop')];
  let w=0,h=0,aw=0,ah=0,mobile=false;
  const measure=()=>{w=stage.clientWidth;h=stage.clientHeight;aw=anchor.offsetWidth;ah=anchor.offsetHeight;mobile=w<=760;span.current=Math.max(1,(track.offsetHeight-h)/2);last=-1};
  measure();
  const wake=()=>{if(!frame&&alive){stamp=performance.now()-16;frame=requestAnimationFrame(tick)}};
  const resize=()=>{measure();wake()};
  window.addEventListener('scroll',wake,{passive:true});window.addEventListener('resize',resize);
  const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  const ease=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10)};
  const poses=[{x:68,y:47,s:1,rot:-12,orbit:35,phi:76,fov:29},{x:30,y:46,s:.83,rot:8,orbit:195,phi:84,fov:29},{x:66,y:44,s:1.23,rot:-9,orbit:365,phi:72,fov:26}];

  const tick=()=>{
   frame=0;if(!alive)return;
   const now=performance.now();const dt=Math.min(100,now-stamp);stamp=now;
   if(jump.current&&!off){const j=jump.current;const duration=1650;const elapsed=(now-j.at)/duration;window.scrollTo({top:mix(j.from,j.to,clamp(elapsed)),behavior:'instant'});if(elapsed>=1)jump.current=null;}
   const target=off?fixed.current:Math.min(2,Math.max(0,window.scrollY/span.current));
   current.current=off?target:mix(current.current,target,1-Math.exp(-dt/210));
   if(Math.abs(current.current-target)<.0002)current.current=target;
   const p=current.current;if(Math.abs(p-last)<.00002&&!jump.current){if(Math.abs(p-target)>.0002)frame=requestAnimationFrame(tick);return}last=p;
   const a=Math.min(1,Math.floor(p));const raw=p-a;const t=ease(raw);const A=poses[a],B=poses[a+1];
   const nearest=Math.round(p);if(nearest!==sceneRef.current){sceneRef.current=nearest;setScene(nearest)}
   const x=mobile?mix(50,56,ease(p-1)):mix(A.x,B.x,t);
   const y=mobile?48:mix(A.y,B.y,t);const turnRoom=mobile&&a===1?1-.28*Math.sin(Math.PI*t):1;const scale=mix(A.s,B.s,t)*(mobile?.9/.72:1/.85)*turnRoom;
   anchor.style.transform=`translate3d(${w*x/100-aw/2}px,${h*y/100-ah/2}px,0) scale(${scale}) rotate(${mix(A.rot,B.rot,t)}deg)`;
   backdrops[0].style.opacity=String(ease(p));backdrops[1].style.opacity=String(ease(p-1));
   // Maintain contrast on every canvas. Scene copy is hidden while ink switches.
   const dark=p>1.55?1:0;if(dark!==ink){ink=dark;r.style.setProperty('--film-ink',dark?'#f2efe1':'#1c2627')}
   copies.forEach((el,i)=>{const d=p-i;const visibility=ease(1-Math.abs(d)/.5);el.style.opacity=String(visibility);el.style.transform=off?'none':`translate3d(${(1-visibility)*Math.sign(-d)*45}px,${(1-visibility)*12}px,0)`;el.style.visibility=visibility>.001?'visible':'hidden'});
   labels.forEach((el,i)=>{el.style.opacity=String(ease(1-Math.abs(p-i)/.45))});
   if(viewer.current&&!free){viewer.current.setAttribute('camera-orbit',`${mix(A.orbit,B.orbit,t)}deg ${mix(A.phi,B.phi,t)}deg auto`);viewer.current.setAttribute('field-of-view',`${mix(A.fov,B.fov,t)}deg`)}
   frame=requestAnimationFrame(tick);
  };wake();return()=>{alive=false;cancelAnimationFrame(frame);window.removeEventListener('scroll',wake);window.removeEventListener('resize',resize)};
 },[off,free,loaded,attempt]);
 function go(n:number){setFree(false);fixed.current=n;if(off){jump.current=null;current.current=n;setScene(n)}else {jump.current={from:scrollY,to:n*span.current,at:performance.now()}}window.dispatchEvent(new Event('scroll'))}
 return <main ref={root} className={`rf-root ${loaded?'rf-ready':''} ${off?'rf-off':''}`}>
  <div className={`rf-scroll ${reduced?'rf-short':''}`}><section className="rf-stage" onTouchStart={swipeStart} onTouchMove={swipeMove} onTouchEnd={swipeEnd} onTouchCancel={()=>{swipe.current=null}}>
   <header className="rf-nav"><Link to="/" className="rf-logo">elusive·hue</Link><span>OBJECT STUDIES / 001</span><Link to="/">Gallery ↗</Link></header>
   <div className="rf-backdrop rf-backdrop-green" aria-hidden="true"/><div className="rf-backdrop rf-backdrop-dark" aria-hidden="true"/><div className="rf-light" aria-hidden="true"/>
   <div className="rf-watermark" aria-hidden="true">{scene===0?'01':scene===1?'02':'03'}</div>
   <div className="rf-copy rf-copy-0"><span className="rf-eyebrow">A SECOND LOOK</span><h1>Some things <br/>deserve<br/><i>another story.</i></h1><p>New perspectives.<br/>On things with a past.</p></div>
   <div className="rf-copy rf-copy-1"><span className="rf-eyebrow">TURN THE FAMILIAR</span><h2>A different<br/><i>point of view.</i></h2><p>One object. Every angle.<br/>A closer look at the sample's form.</p></div>
   <div className="rf-copy rf-copy-2"><span className="rf-eyebrow">LOOK A LITTLE CLOSER</span><h2>Details make<br/><i>the difference.</i></h2><p>Keep something good<br/>in the picture.</p></div>
   <div className="rf-object-anchor"><div className="rf-product">
    {!error?<model-viewer ref={(m:Viewer|null)=>{viewer.current=m}} src={`/models/camera-body.glb?attempt=${attempt}`} alt="Antique camera body, cropped CC0 demonstration model, not the dummy SLR listing" interpolation-decay="1" environment-image="neutral" shadow-intensity="0" exposure="1.15" touch-action="pan-y" interaction-prompt="none" {...(free?{'camera-controls':''}:{})}/>:<div className="rf-preflight"><span className="rf-orbit-icon" aria-hidden="true">↻</span><p>The model could not load.</p><button onClick={()=>{setAttempt(a=>a+1);setLoaded(false);setError(false)}}>Try 3D again ↗</button><small>0.78 MB sample</small></div>}
   </div></div>
   {!loaded&&!error&&<p className="rf-loading" role="status">Loading sample camera... 0.78 MB</p>}
   <div className="rf-object-note"><span>ANTIQUE CAMERA / SAMPLE MODEL</span><p className="rf-scene-label">Camera body in three-quarter view.</p><p className="rf-scene-label">A continuous turn, not a second image.</p><p className="rf-scene-label">Move closer. The same model stays on stage.</p></div>
   <div className="rf-tools">{loaded&&<button onClick={()=>{if(free)viewer.current?.removeAttribute('camera-orbit');setFree(!free)}}>{free?'Return to story':'Inspect freely'} ↗</button>}<button onClick={()=>setPhoto(true)}>Original listing photo ↗</button><button disabled={reduced} onClick={()=>{fixed.current=current.current;jump.current=null;pause(!paused)}}>{reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button></div>
   {free&&<p className="rf-free-hint">Drag to orbit · pinch or scroll to zoom</p>}
   <footer className="rf-controller"><span className="rf-demo">DESIGN STUDY · NOT FOR SALE</span><nav aria-label="Product story scenes">{['First look','Every angle','Closer'].map((v,i)=><button key={v} className={scene===i?'active':''} aria-current={scene===i?'step':undefined} onClick={()=>go(i)}><b>0{i+1}</b><span>{v}</span></button>)}</nav><span className="rf-scroll-cue">{reduced?'Choose a view above':paused?'Motion paused':'Swipe ↔ or scroll ↓'}</span></footer>
  </section></div>
  <section className="rf-listing"><div><span className="rf-eyebrow">THE LISTING / DEMO DATA</span><h2>{item.title}</h2><p>{item.price} <small>Illustrative price</small></p></div><div><p>{item.blurb}</p><p>Listed by {item.seller}. {item.kind}.</p><p className="rf-caveat">This antique camera body is a cropped and optimized Khronos CC0 sample by Maximillan Kamps / UX3D. It is not the exact SLR in the listing photo. Dummy listing only; nothing is for sale and ordering is not enabled.</p><Link to="/">Back to the shelf ↗</Link></div></section>
  {photo&&<dialog ref={dialog} className="rf-photo-dialog" aria-label="Original listing photograph" onCancel={()=>setPhoto(false)}><button onClick={()=>setPhoto(false)} autoFocus>Close photo ×</button><img src={item.img} alt="Photo for the dummy Volt 35mm SLR listing"/><p>Original dummy listing photo. The 3D camera is a different sample.</p></dialog>}
 </main>;
   }
