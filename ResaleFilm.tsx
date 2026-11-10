import React,{useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import '@google/model-viewer';
import {RESALE_ITEMS} from './resale-items';
import './resale-film.css';

type Viewer=HTMLElement&{loaded?:boolean};
export function ResaleFilm(){
 const item=RESALE_ITEMS[0];
 const root=useRef<HTMLElement>(null);const viewer=useRef<Viewer|null>(null);
 const [attempt,setAttempt]=useState(0);const [started,start]=useState(false);const [loaded,setLoaded]=useState(false);const [error,setError]=useState(false);
 const [free,setFree]=useState(false);const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [paused,pause]=useState(false);const [scene,setScene]=useState(0);const [photo,setPhoto]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(photo&&!dialog.current?.open)dialog.current?.showModal()},[photo]);
 const fixed=useRef(0);const current=useRef(0);const sceneRef=useRef(0);
 const jump=useRef<{from:number;to:number;at:number}|null>(null);
 const off=reduced||paused;
 useEffect(()=>{window.scrollTo(0,0);const mq=matchMedia('(prefers-reduced-motion: reduce)');const fn=()=>setReduced(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn)},[]);
 useEffect(()=>{const m=viewer.current;if(!m)return;const done=()=>setLoaded(true);const fail=()=>{setError(true);setLoaded(false)};m.addEventListener('load',done);m.addEventListener('error',fail);if(m.loaded)setLoaded(true);return()=>{m.removeEventListener('load',done);m.removeEventListener('error',fail)}},[started,error]);
 useEffect(()=>{
  const stop=()=>{jump.current=null};const key=(e:KeyboardEvent)=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key))stop()};
  window.addEventListener('wheel',stop,{passive:true});window.addEventListener('touchstart',stop,{passive:true});window.addEventListener('keydown',key);
  return()=>{window.removeEventListener('wheel',stop);window.removeEventListener('touchstart',stop);window.removeEventListener('keydown',key)};
 },[]);
 useEffect(()=>{
  let frame=0;let alive=true;let last=-1;let stamp=performance.now();let width=innerWidth;let height=innerHeight;
  const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
  const clamp=(v:number)=>Math.max(0,Math.min(1,v));
  const ease=(v:number)=>{const t=clamp(v);return t*t*t*(t*(t*6-15)+10)};
  const poses=[{x:68,y:47,s:1,rot:-12,orbit:35,phi:76,fov:29},{x:30,y:46,s:.83,rot:8,orbit:195,phi:84,fov:29},{x:66,y:44,s:1.23,rot:-9,orbit:365,phi:72,fov:26}];
  const colors=[[237,237,232],[165,201,189],[29,38,41]];
  const tick=()=>{
   if(!alive)return;const r=root.current;if(!r)return;
   const now=performance.now();const dt=Math.min(100,now-stamp);stamp=now;
   if(jump.current&&!off){const j=jump.current;const duration=1650;const elapsed=(now-j.at)/duration;window.scrollTo({top:mix(j.from,j.to,clamp(elapsed)),behavior:'instant'});if(elapsed>=1)jump.current=null;}
   const target=off?fixed.current:Math.min(2,Math.max(0,window.scrollY/(innerHeight*.95)));
   current.current=off?target:mix(current.current,target,1-Math.exp(-dt/210));
   if(Math.abs(current.current-target)<.0002)current.current=target;
   const p=current.current;const resized=width!==innerWidth||height!==innerHeight;width=innerWidth;height=innerHeight;
   if(!resized&&Math.abs(p-last)<.00002){frame=requestAnimationFrame(tick);return}last=p;
   const a=Math.min(1,Math.floor(p));const raw=p-a;const t=ease(raw);const A=poses[a],B=poses[a+1];
   const nearest=Math.round(p);if(nearest!==sceneRef.current){sceneRef.current=nearest;setScene(nearest)}
   const mobile=innerWidth<=760;const x=mobile?mix(50,56,ease(p-1)):mix(A.x,B.x,t);
   r.style.setProperty('--object-x',x+'%');r.style.setProperty('--object-y',(mobile?45:mix(A.y,B.y,t))+'%');
   r.style.setProperty('--object-scale',String(mix(A.s,B.s,t)*(mobile?.9:1)));r.style.setProperty('--object-tilt',mix(A.rot,B.rot,t)+'deg');
   r.style.setProperty('--film-bg',`rgb(${colors[a].map((n,i)=>Math.round(mix(n,colors[a+1][i],t))).join(',')})`);
   // Maintain contrast on every canvas. Scene copy is hidden while ink switches.
   const dark=p>1.55?1:0;r.style.setProperty('--film-ink',`rgb(${[28,38,39].map((n,i)=>Math.round(mix(n,[242,239,225][i],dark))).join(',')})`);
   r.querySelectorAll<HTMLElement>('.rf-copy').forEach((el,i)=>{const d=p-i;const visibility=ease(1-Math.abs(d)/.5);el.style.opacity=String(visibility);el.style.transform=off?'none':`translate3d(${(1-visibility)*Math.sign(-d)*45}px,${(1-visibility)*12}px,0)`;el.style.visibility=visibility>.001?'visible':'hidden'});
   r.querySelectorAll<HTMLElement>('.rf-scene-label').forEach((el,i)=>{el.style.opacity=String(ease(1-Math.abs(p-i)/.45))});
   if(viewer.current&&!free){viewer.current.setAttribute('camera-orbit',`${mix(A.orbit,B.orbit,t)}deg ${mix(A.phi,B.phi,t)}deg auto`);viewer.current.setAttribute('field-of-view',`${mix(A.fov,B.fov,t)}deg`)}
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>{alive=false;cancelAnimationFrame(frame)};
 },[off,free,loaded,attempt]);
 function go(n:number){setFree(false);fixed.current=n;if(off){jump.current=null;current.current=n;setScene(n)}else jump.current={from:scrollY,to:n*innerHeight*.95,at:performance.now()}}
 return <main ref={root} className={`rf-root ${loaded?'rf-ready':''} ${off?'rf-off':''}`}>
  <div className={`rf-scroll ${reduced?'rf-short':''}`}><section className="rf-stage">
   <header className="rf-nav"><Link to="/" className="rf-logo">elusive·hue</Link><span>OBJECT STUDIES / 001</span><Link to="/">Gallery ↗</Link></header>
   <div className="rf-grain" aria-hidden="true"/><div className="rf-light" aria-hidden="true"/>
   <div className="rf-watermark" aria-hidden="true">{scene===0?'01':scene===1?'02':'03'}</div>
   <div className="rf-copy rf-copy-0"><span className="rf-eyebrow">A SECOND LOOK</span><h1>Some things <br/>deserve<br/><i>another story.</i></h1><p>New perspectives.<br/>On things with a past.</p></div>
   <div className="rf-copy rf-copy-1"><span className="rf-eyebrow">TURN THE FAMILIAR</span><h2>A different<br/><i>point of view.</i></h2><p>One object. Every angle.<br/>A closer look at the sample's form.</p></div>
   <div className="rf-copy rf-copy-2"><span className="rf-eyebrow">LOOK A LITTLE CLOSER</span><h2>Details make<br/><i>the difference.</i></h2><p>Keep something good<br/>in the picture.</p></div>
   <div className="rf-object-anchor"><div className="rf-product">
    {started&&!error?<model-viewer ref={(m:Viewer|null)=>{viewer.current=m}} src={`/models/camera-body.glb?attempt=${attempt}`} alt="Antique camera body, cropped CC0 demonstration model, not the dummy SLR listing" interpolation-decay={off?"1":"35"} environment-image="neutral" shadow-intensity=".4" exposure="1.15" interaction-prompt="none" {...(free?{'camera-controls':'','touch-action':'pan-y'}:{})}/>:<div className="rf-preflight"><span className="rf-orbit-icon" aria-hidden="true">↻</span><p>{error?'The model could not load.':'A three-scene product study.'}</p><button onClick={()=>{setAttempt(a=>a+1);setLoaded(false);start(true);setError(false)}}>{error?'Try 3D again':'Play the 3D story'} ↗</button><small>0.78 MB sample · loads only on tap</small></div>}
   </div></div>
   {started&&!loaded&&!error&&<p className="rf-loading" role="status">Loading sample camera... 0.78 MB</p>}
   <div className="rf-object-note"><span>ANTIQUE CAMERA / SAMPLE MODEL</span><p className="rf-scene-label">Camera body in three-quarter view.</p><p className="rf-scene-label">A continuous turn, not a second image.</p><p className="rf-scene-label">Move closer. The same model stays on stage.</p></div>
   <div className="rf-tools">{loaded&&<button onClick={()=>{if(free)viewer.current?.removeAttribute('camera-orbit');setFree(!free)}}>{free?'Return to story':'Inspect freely'} ↗</button>}<button onClick={()=>setPhoto(true)}>Original listing photo ↗</button><button disabled={reduced} onClick={()=>{fixed.current=current.current;jump.current=null;pause(!paused)}}>{reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button></div>
   {free&&<p className="rf-free-hint">Drag to orbit · pinch or scroll to zoom</p>}
   <footer className="rf-controller"><span className="rf-demo">DESIGN STUDY · NOT FOR SALE</span><nav aria-label="Product story scenes">{['First look','Every angle','Closer'].map((v,i)=><button key={v} className={scene===i?'active':''} aria-current={scene===i?'step':undefined} onClick={()=>go(i)}><b>0{i+1}</b><span>{v}</span></button>)}</nav><button className="rf-next-scene" onClick={()=>go((scene+1)%3)}>{scene===2?'Replay':'Next scene'} <span>→</span></button></footer>
  </section></div>
  <section className="rf-listing"><div><span className="rf-eyebrow">THE LISTING / DEMO DATA</span><h2>{item.title}</h2><p>{item.price} <small>Illustrative price</small></p></div><div><p>{item.blurb}</p><p>Listed by {item.seller}. {item.kind}.</p><p className="rf-caveat">This antique camera body is a cropped and optimized Khronos CC0 sample by Maximillan Kamps / UX3D. It is not the exact SLR in the listing photo. Dummy listing only; nothing is for sale and ordering is not enabled.</p><Link to="/">Back to the shelf ↗</Link></div></section>
  {photo&&<dialog ref={dialog} className="rf-photo-dialog" aria-label="Original listing photograph" onCancel={()=>setPhoto(false)}><button onClick={()=>setPhoto(false)} autoFocus>Close photo ×</button><img src={item.img} alt="Photo for the dummy Volt 35mm SLR listing"/><p>Original dummy listing photo. The 3D camera is a different sample.</p></dialog>}
 </main>;
}
