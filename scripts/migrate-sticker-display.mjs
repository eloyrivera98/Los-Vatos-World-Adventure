import pg from 'pg'
import fs from 'node:fs'
const client=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED})
try{await client.connect();await client.query(fs.readFileSync('neon/sticker-display.sql','utf8'));console.log(JSON.stringify({stickerNumbers:true}))}finally{await client.end()}