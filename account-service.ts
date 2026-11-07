import {createClient,type SupabaseClient} from '@supabase/supabase-js';

// Disabled by default. Only the approved project URL and public browser key belong here.
// Never put a service-role key or a database password in browser configuration.
let sharedClient:SupabaseClient|null=null;
export function configuredAccountClient(): SupabaseClient|null {
 if(sharedClient)return sharedClient;
 const url=import.meta.env.VITE_SUPABASE_URL;
 const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(import.meta.env.VITE_ENABLE_AUTH!=='true'||!url||!key)return null;
 if(url!=='https://vljgcrbcncryyeztowrp.supabase.co')throw new Error('Use the approved Supabase project URL.');
 return sharedClient=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
}
export function authReturnUrl(recovery=false):string {
 const raw=import.meta.env.VITE_AUTH_RETURN_URL;
 if(!raw)throw new Error('Account confirmation is not configured yet.');
 const url=new URL(raw);
 if(url.origin!==location.origin||url.pathname!=='/auth/callback'||url.hash||url.search||(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost'))throw new Error('The account return URL must match this site.');
 if(recovery)url.searchParams.set('flow','recovery');
 return url.toString();
}
export type Profile={id:string;username:string|null;display_name:string;bio:string};
export type ProfileFields=Pick<Profile,'username'|'display_name'|'bio'>;
export type ArtworkFields={title:string;medium:string;format:'Physical'|'Digital';size_class:'Small'|'Medium'|'Large';width:number;height:number;unit:'cm'|'px';asking_price_inr:number;image_path:string};
export type Artwork=ArtworkFields & {id:string;owner_id:string;status:'draft'|'published';created_at:string;updated_at:string};
export function cleanProfile(p:ProfileFields):ProfileFields {
 const username=(p.username||'').trim();
 if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))throw new Error('Use 3-24 letters, numbers or underscores for your username.');
 if(p.display_name.trim().length>80)throw new Error('Keep your display name within 80 characters.');
 if(p.bio.trim().length>500)throw new Error('Keep your bio within 500 characters.');
 return {username,display_name:p.display_name.trim(),bio:p.bio.trim()};
}
export function checkArtwork(p:ArtworkFields,owner:string):ArtworkFields {
 const title=p.title.trim(),medium=p.medium.trim();
 if(!title||title.length>100||!medium||medium.length>100)throw new Error('Add a title and art medium, up to 100 characters each.');
 if(!['Physical','Digital'].includes(p.format)||!['Small','Medium','Large'].includes(p.size_class))throw new Error('Choose the artwork format and size.');
 if(!Number.isFinite(p.width)||!Number.isFinite(p.height)||p.width<=0||p.height<=0||p.width>100000||p.height>100000)throw new Error('Dimensions must be above zero and at most 100,000.');
 if(p.format==='Physical'?p.unit!=='cm':p.unit!=='px'||!Number.isInteger(p.width)||!Number.isInteger(p.height))throw new Error('Use cm for physical artwork and whole pixels for digital artwork.');
 if(!Number.isInteger(p.asking_price_inr)||p.asking_price_inr<1||p.asking_price_inr>10000000)throw new Error('Use a whole-rupee price from 1 to 10,000,000.');
 if(!p.image_path.startsWith(owner+'/')||p.image_path.includes('..')||p.image_path.length<38||p.image_path.length>250)throw new Error('Choose an image from your own artwork folder.');
 // Explicit fields only. Do not pass owner/id/status supplied by an editor form.
 return {title,medium,format:p.format,size_class:p.size_class,width:p.width,height:p.height,unit:p.unit,asking_price_inr:p.asking_price_inr,image_path:p.image_path};
}
function fail(error:{code?:string;message:string}|null):void {
 if(!error)return;
 if(error.code==='23505')throw new Error('That username is already taken. Try another.');
 throw new Error(error.message);
}
export function accountRepository(client:SupabaseClient){
 const owner=async()=>{const {data,error}=await client.auth.getUser();fail(error);if(!data.user)throw new Error('Sign in to continue.');return data.user.id;};
 return {
  async profile(){const id=await owner();const {data,error}=await client.from('profiles').select('id,username,display_name,bio').eq('id',id).maybeSingle();fail(error);return data as Profile|null;},
  async saveProfile(fields:ProfileFields){
   const id=await owner(),value=cleanProfile(fields);
   const {data:existing,error:readError}=await client.from('profiles').select('id').eq('id',id).maybeSingle();fail(readError);
   // Avoid UPSERT: UPDATE grants deliberately exclude id and ownership columns.
   const result=existing?await client.from('profiles').update(value).eq('id',id).select('id,username,display_name,bio').single():await client.from('profiles').insert({id,...value}).select('id,username,display_name,bio').single();
   fail(result.error);return result.data as Profile;
  },
  async myArtworks(){const id=await owner();const {data,error}=await client.from('artworks').select('*').eq('owner_id',id).order('created_at',{ascending:false});fail(error);return data as Artwork[];},
  async draft(fields:ArtworkFields){const id=await owner(),value=checkArtwork(fields,id);const {data,error}=await client.from('artworks').insert({...value,owner_id:id,status:'draft'}).select().single();fail(error);return data as Artwork;},
  async edit(id:string,fields:ArtworkFields){const uid=await owner(),value=checkArtwork(fields,uid);const {data,error}=await client.from('artworks').update(value).eq('id',id).eq('owner_id',uid).select().single();fail(error);return data as Artwork;},
  async uploadPhoto(file:File){
   const uid=await owner(),extension:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
   if(!extension[file.type]||file.size>8388608||file.size===0)throw new Error('Choose a JPG, PNG or WebP image up to 8MB.');
   const path=uid+'/'+crypto.randomUUID()+'.'+extension[file.type];
   const {error}=await client.storage.from('artwork-photos').upload(path,file,{contentType:file.type,upsert:false});fail(error);return path;
  },
  async previewPhoto(path:string){const {data,error}=await client.storage.from('artwork-photos').createSignedUrl(path,300);fail(error);return data!.signedUrl;}
 };
}
