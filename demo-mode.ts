// PREVIEW-ONLY demo. Never merge to main. Activated by adding ?alertsdemo=1 to the URL.
// While active, every request to the Supabase host is answered locally with clearly fake data,
// so nothing is read from or written to the real backend.
const KEY='sb-vljgcrbcncryyeztowrp-auth-token';
const FLAG='eh-alerts-demo';
const BACKUP='eh-alerts-demo-backup';
function start(){
  const ME='11111111-1111-1111-1111-111111111111',BUYER='22222222-2222-2222-2222-222222222222';
  const iso=new Date().toISOString();
  const art=(id:string,title:string,owner:string)=>({id,owner_id:owner,title,medium:'Oil',format:'Physical',size_class:'Small',width:30,height:40,unit:'cm',asking_price_inr:5000,description:'Demo artwork',for_sale:true,sold_out:false,delivery_fee_inr:0,image_path:'p.jpg',status:'published',created_at:iso,updated_at:iso});
  const mine=art('aaaaaaaa-0000-0000-0000-000000000001','Ember Study (demo)',ME);
  const theirs=art('bbbbbbbb-0000-0000-0000-000000000002','Vessel in Red (demo)',BUYER);
  const ord=(p:object)=>({id:'o'+Math.random().toString(16).slice(2,8),artwork_id:mine.id,status:'pending',amount_inr:5000,created_at:iso,payment_state:'none',first_name:'Demo buyer',area:'110',buyer_name:null,buyer_phone:null,delivery_address:null,delivery_pin:null,buyer_email:null,delivery_fee_inr:0,delivery_state:'none',courier:'',tracking_id:'',tracking_url:'',refund_state:'none',refund_upi:'',cancelled_at:null,...p});
  const artistOrders=[ord({}),ord({status:'confirmed',payment_state:'buyer_marked'})];
  const artistOffers=[{id:'of1',artwork_id:mine.id,buyer_id:BUYER,amount_inr:4000,note:'',status:'pending',counter_amount_inr:null,created_at:iso,updated_at:iso}];
  const buyerOffers=[{id:'of2',artwork_id:theirs.id,buyer_id:ME,amount_inr:3000,note:'',status:'countered',counter_amount_inr:4000,created_at:iso,updated_at:iso}];
  const buyerOrders=[ord({status:'confirmed',artwork_id:theirs.id,buyer_name:'Demo',buyer_phone:'9',delivery_address:'x',delivery_pin:'1',buyer_email:'',offer_id:null,qr_path_snapshot:'',upi_id_snapshot:'demo@upi',payee_name_snapshot:'Demo artist'})];
  const json=(b:unknown)=>new Response(JSON.stringify(b),{status:200,headers:{'content-type':'application/json','content-range':'0-0/*'}});
  const realFetch=window.fetch.bind(window);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    if(!raw.includes('.supabase.co'))return realFetch(input,init);
    const u=new URL(raw);const method=(init?.method||(typeof input!=='string'&&!(input instanceof URL)?input.method:'GET')).toUpperCase();
    const p=u.pathname;
    if(p==='/auth/v1/user')return json({id:ME,aud:'authenticated',email:'demo@example.invalid'});
    if(method!=='GET'&&!p.startsWith('/rest/v1/rpc/artist_order_requests')&&!p.startsWith('/rest/v1/rpc/published_artwork_by_prefix')&&!p.startsWith('/storage/v1/object/sign'))return json([]);
    if(p==='/rest/v1/artworks')return json([mine]);
    if(p==='/rest/v1/offers')return json(u.searchParams.get('buyer_id')?buyerOffers:artistOffers);
    if(p==='/rest/v1/order_requests')return json(buyerOrders);
    if(p==='/rest/v1/rpc/artist_order_requests')return json(artistOrders);
    if(p==='/rest/v1/rpc/published_artwork_by_prefix')return json([theirs]);
    if(p.startsWith('/storage/v1/object/sign'))return json({signedURL:'/object/sign/artwork-photos/p.jpg?token=demo'});
    return json([]);
  };
  const svg='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#1a1a1a"/><circle cx="150" cy="190" r="70" fill="#d0d5ab" opacity=".5"/><text x="150" y="360" fill="#d0d5ab" font-family="Georgia" font-size="16" text-anchor="middle">demo image</text></svg>');
  const fix=(root:ParentNode)=>root.querySelectorAll?.('img').forEach(i=>{if(i.src.includes('/object/sign/')&&i.src!==svg)i.src=svg;});
  new MutationObserver(()=>fix(document)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  window.addEventListener('DOMContentLoaded',()=>{
    const b=document.createElement('div');
    b.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#d0d5ab;color:#000;font:13px Georgia,serif;padding:8px 12px;text-align:center';
    b.innerHTML='DEMO with fake data. Nothing here is real or saved. <a href="#" style="color:#000;text-decoration:underline" id="eh-demo-exit">Exit demo</a>';
    document.body.appendChild(b);
    b.querySelector('#eh-demo-exit')!.addEventListener('click',e=>{e.preventDefault();sessionStorage.removeItem(FLAG);const old=localStorage.getItem(BACKUP);if(old)localStorage.setItem(KEY,old);else localStorage.removeItem(KEY);localStorage.removeItem(BACKUP);location.href=location.pathname+location.hash;});
  });
}
if(new URLSearchParams(location.search).get('alertsdemo')==='1')sessionStorage.setItem(FLAG,'1');
if(sessionStorage.getItem(FLAG)==='1'){
  if(localStorage.getItem(BACKUP)===null)localStorage.setItem(BACKUP,localStorage.getItem(KEY)??'');
  const ME='11111111-1111-1111-1111-111111111111';
  const exp=Math.floor(Date.now()/1000)+99999;
  localStorage.setItem(KEY,JSON.stringify({access_token:'a.b.c',refresh_token:'r',token_type:'bearer',expires_in:99999,expires_at:exp,user:{id:ME,aud:'authenticated',email:'demo@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01'}}));
  start();
}
export {};
