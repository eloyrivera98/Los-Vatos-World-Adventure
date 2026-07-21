import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  const version = await client.query("select current_setting('server_version') version, exists(select 1 from pg_namespace where nspname='neon_auth') auth_ready")
  const columns = await client.query("select table_name,column_name,data_type from information_schema.columns where table_schema='neon_auth' order by table_name,ordinal_position")
  console.log(JSON.stringify({ connected:true, version:version.rows[0].version, auth_ready:version.rows[0].auth_ready, auth_tables:[...new Set(columns.rows.map(row=>row.table_name))], user_columns:columns.rows.filter(row=>row.table_name==='user') },null,2))
} catch(error) {
  console.error('CONNECTION_FAILED:', error.code ?? error.message)
  process.exitCode=1
} finally { await client.end().catch(()=>{}) }