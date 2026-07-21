import pg from 'pg'
import fs from 'node:fs'
const client=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL})
try{await client.connect();await client.query(fs.readFileSync('neon/city-hints.sql','utf8'));console.log(JSON.stringify({cityHints:true}))}finally{await client.end().catch(()=>{})}
