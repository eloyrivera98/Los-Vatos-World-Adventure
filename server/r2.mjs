import {PutObjectCommand,S3Client} from '@aws-sdk/client-s3'
import {randomUUID} from 'node:crypto'

const settings={accountId:process.env.R2_ACCOUNT_ID,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:process.env.R2_BUCKET_NAME,publicUrl:process.env.R2_PUBLIC_URL?.replace(/\/$/,'')}
let client
function configured(){return Object.values(settings).every(Boolean)}
function getClient(){if(!configured())throw Object.assign(new Error('El almacenamiento R2 no está configurado todavía. Revisa las variables de entorno de Render.'),{status:503});return client??=new S3Client({region:'auto',endpoint:`https://${settings.accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:settings.accessKeyId,secretAccessKey:settings.secretAccessKey}})}
export async function uploadDataImage(dataUrl,folder){const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||'');if(!match)throw Object.assign(new Error('La imagen no tiene un formato válido'),{status:400});const format=match[1],extension=format==='jpeg'?'jpg':format,key=`${folder}/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${extension}`,body=Buffer.from(match[2],'base64');await getClient().send(new PutObjectCommand({Bucket:settings.bucket,Key:key,Body:body,ContentType:`image/${format}`,CacheControl:'public, max-age=31536000, immutable'}));return{key,url:`${settings.publicUrl}/${key}`}}
export const isR2Configured=configured