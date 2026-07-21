import {PutObjectCommand,S3Client} from '@aws-sdk/client-s3'
import fs from 'node:fs'
import pg from 'pg'
const needed=['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_PUBLIC_URL']
for(const name of needed)if(!process.env[name])throw new Error(`Falta ${name}`)
const r2=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}})
const lisboaResponse=await fetch('https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85')
if(!lisboaResponse.ok)throw new Error(`No se pudo descargar Lisboa: ${lisboaResponse.status}`)
const assets=[
 {key:'demo/lisboa-tajo.jpg',body:Buffer.from(await lisboaResponse.arrayBuffer()),type:'image/jpeg'},
 {key:'demo/granada-alhambra.png',body:fs.readFileSync('assets/demo/granada-alhambra.png'),type:'image/png'}
]
for(const asset of assets)await r2.send(new PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:asset.key,Body:asset.body,ContentType:asset.type,CacheControl:'public, max-age=3600'}))
const base='' // Copias locales fiables para la cuenta demo
const db=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL})
try{
 await db.connect();await db.query('begin')
 const updated=await db.query(`update sticker_content sc set photo_url=case s.public_city when 'Lisboa' then $1 when 'Granada' then $2 end,photo_storage_key=case s.public_city when 'Lisboa' then 'demo/lisboa-tajo.jpg' when 'Granada' then 'demo/granada-alhambra.png' end,photo_kind='place' from stickers s join groups g on g.id=s.group_id where sc.sticker_id=s.id and g.is_demo=true and s.public_city in ('Lisboa','Granada') returning s.public_city,sc.title,sc.photo_url`,[`${base}/demo/lisboa-tajo.jpg`,`${base}/demo/granada-alhambra.png`])
 const people=await db.query(`select u.email,u.id from neon_auth."user" u where u.email in ('demo-presentacion@losvatos.app','demo-friend@losvatos.invalid')`);const ids=Object.fromEntries(people.rows.map(row=>[row.email,row.id]));const demoId=ids['demo-presentacion@losvatos.app'],friendId=ids['demo-friend@losvatos.invalid'];const granada=(await db.query(`select s.id,s.group_id from stickers s join groups g on g.id=s.group_id where g.is_demo=true and s.public_city='Granada' limit 1`)).rows[0];if(granada&&demoId&&friendId){await db.query('delete from discoveries where sticker_id=$1',[granada.id]);await db.query("update stickers set activated_by=$1,status='HIDDEN',first_discovered_at=null,updated_at=now() where id=$2",[friendId,granada.id]);await db.query('delete from activities where sticker_id=$1',[granada.id]);await db.query("insert into activities(group_id,actor_id,sticker_id,activity_type,metadata,created_at) values($1,$2,$3,'ACTIVATED','{\"city\":\"Granada\"}',now()-interval '3 days')",[granada.group_id,friendId,granada.id]);await db.query("insert into sticker_hint_unlocks(sticker_id,user_id,city) values($1,$2,'Granada') on conflict do nothing",[granada.id,demoId])}
 await db.query('commit');console.log(JSON.stringify({uploaded:assets.length,updated:updated.rows,demoStates:'Lisboa coleccionado · Granada con foto-pista'},null,2))
}catch(error){await db.query('rollback').catch(()=>{});throw error}finally{await db.end().catch(()=>{})}
