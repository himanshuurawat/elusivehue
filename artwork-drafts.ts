import {type SupabaseClient} from '@supabase/supabase-js';
import {accountRepository,checkArtwork,type Artwork,type ArtworkFields} from './account-service';

export type DraftDetails=Omit<ArtworkFields,'image_path'>;
export type DraftAttempt={id:string;path:string;uploaded:boolean};
export const newDraftAttempt=():DraftAttempt=>({id:crypto.randomUUID(),path:'',uploaded:false});

// Store one web-sized preview, not an original digital download or duplicate copies.
export async function prepareArtworkPhoto(file:File):Promise<File>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>8388608)throw new Error('Choose a JPG, PNG or WebP photo up to 8 MB.');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('That photo could not be opened. Choose another image.');}
 try{
  if(bitmap.width*bitmap.height>40000000)throw new Error('Choose a photo under 40 megapixels.');
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Photo processing is unavailable in this browser.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare this photo.')),'image/webp',.86));
  if(blob.type!=='image/webp'||blob.size>2097152)throw new Error('This photo is too detailed. Choose a smaller image.');
  return new File([blob],'artwork-preview.webp',{type:'image/webp'});
 }finally{bitmap.close();}
}

export async function saveArtworkDraft(client:SupabaseClient,photo:File,details:DraftDetails,attempt:DraftAttempt):Promise<Artwork>{
 const {data,error}=await client.auth.getUser();if(error)throw error;if(!data.user)throw new Error('Sign in again before saving.');
 const owner=data.user.id,path=`${owner}/${attempt.id}.webp`;
 if(attempt.path&&attempt.path!==path)throw new Error('The signed-in account changed. Close this draft and start again.');
 attempt.path=path;
 const fields=checkArtwork({...details,image_path:path},owner);
 // Retry the same UUID. A response lost after commit must never create a second draft.
 const existing=await client.from('artworks').select('*').eq('owner_id',owner).eq('id',attempt.id).maybeSingle();
 if(existing.error)throw existing.error;if(existing.data)return existing.data as Artwork;
 if(!attempt.uploaded){
  const result=await client.storage.from('artwork-photos').upload(path,photo,{contentType:'image/webp',upsert:false});
  if(result.error){
   // A network response may be lost after upload. Re-read this exact own path before retrying.
   const check=await client.storage.from('artwork-photos').download(path);
   if(check.error)throw new Error('Could not upload the photo. Check your connection and retry.');
  }
  attempt.uploaded=true;
 }
 const result=await client.from('artworks').insert({id:attempt.id,owner_id:owner,...fields,status:'draft'}).select().single();
 if(!result.error)return result.data as Artwork;
 const check=await client.from('artworks').select('*').eq('owner_id',owner).eq('id',attempt.id).maybeSingle();
 if(check.data)return check.data as Artwork;
 if(check.error)throw new Error('Save could not be confirmed. Keep this window open and retry to check the same draft.');
 const cleanup=await client.storage.from('artwork-photos').remove([path]);
 if(cleanup.error)throw new Error('Draft was not saved and photo cleanup could not be confirmed. Keep this window open and retry.');
 attempt.uploaded=false;
 throw new Error(result.error.message||'Could not save your draft. Retry when connected.');
}

export async function discardUnconfirmedPhoto(client:SupabaseClient,attempt:DraftAttempt){
 if(!attempt.path)return;
 const {data,error}=await client.auth.getUser();if(error)throw error;if(!data.user||!attempt.path.startsWith(data.user.id+'/'))throw new Error('Sign in to the same account to check this draft.');
 const check=await client.from('artworks').select('id').eq('owner_id',data.user.id).eq('id',attempt.id).maybeSingle();
 if(check.error)throw new Error('Could not check the draft. Please retry before closing.');
 if(!check.data){const result=await client.storage.from('artwork-photos').remove([attempt.path]);if(result.error)throw new Error('Could not remove the unfinished photo. Please retry.');}
 attempt.path='';attempt.uploaded=false;
}

export async function ownArtworkPreviews(client:SupabaseClient){
 const artworks=await accountRepository(client).myArtworks();
 return Promise.all(artworks.map(async artwork=>{
  try{return {artwork,url:await accountRepository(client).previewPhoto(artwork.image_path),photoError:false};}
  catch{return {artwork,url:'',photoError:true};}
 }));
}
