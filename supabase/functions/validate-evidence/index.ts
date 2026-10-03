import { createClient } from 'npm:@supabase/supabase-js@2'

const origins=(Deno.env.get('ALLOWED_ORIGINS')||'https://stueam.github.io').split(',')
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||''
 const cors={'Access-Control-Allow-Origin':origins.includes(origin)?origin:'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try {
  const url=Deno.env.get('SUPABASE_URL')!
  const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}})
  const {data:auth,error:authError}=await user.auth.getUser()
  if(authError||!auth.user)return reply({error:'Sign in required'},401)
  const {attachment_id}=await req.json()
  if(typeof attachment_id!=='string')return reply({error:'Attachment ID required'},400)
  const {data:a,error}=await user.from('attachments').select('*').eq('id',attachment_id).single()
  if(error||!a||a.owner_id!==auth.user.id)return reply({error:'Attachment not found'},404)
  const {data:blob,error:downloadError}=await user.storage.from('submission-evidence').download(a.object_path)
  if(downloadError||!blob)return reply({error:'Upload missing'},400)
  const bytes=new Uint8Array(await blob.arrayBuffer())
  const text=new TextDecoder().decode(bytes)
  const ext=a.filename.split('.').pop()?.toLowerCase()
  let valid=bytes.length===Number(a.byte_size)&&bytes.length<=10485760
  if(a.mime_type==='application/pdf') valid &&= ext==='pdf' && text.startsWith('%PDF-')
  else if(a.mime_type==='image/png') valid &&= ext==='png' && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)
  else if(a.mime_type==='image/jpeg') valid &&= ['jpg','jpeg'].includes(ext) && bytes[0]===255&&bytes[1]===216&&bytes[2]===255
  else if(a.mime_type==='application/json') {valid &&= ext==='json';try{JSON.parse(text)}catch{valid=false}}
  else if(a.mime_type==='text/csv') valid &&= ext==='csv' && !bytes.includes(0) && !text.includes('\uFFFD')
  else valid=false
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('')
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
  const done=await service.rpc('finalize_attachment',{p_id:a.id,p_owner:auth.user.id,p_hash:hash,p_valid:valid})
  if(done.error)return reply({error:'Draft is no longer editable'},409)
  // Format validation is not malware scanning. Evidence stays private in this release.
  return reply({valid})
 } catch {return reply({error:'Could not validate evidence'},400)}
})
