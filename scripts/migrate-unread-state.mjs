import pg from 'pg'
import fs from 'node:fs'
const client=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL})
try{await client.connect();await client.query(fs.readFileSync('neon/unread-state.sql','utf8').replace(/^\uFEFF/,''));console.log(JSON.stringify({unreadState:true}))}finally{await client.end().catch(()=>{})}
