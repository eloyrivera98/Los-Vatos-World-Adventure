import pg from 'pg'
const db=new pg.Client({connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL})
try{
 await db.connect()
 const users=await db.query(`select u.email,u.id from neon_auth."user" u order by u."createdAt" desc limit 10`)
 for(const user of users.rows){
  try{
   await db.query('begin');await db.query("select set_config('app.user_id',$1,true)",[user.id])
   const group=(await db.query('select g.id,g.name,gm.role,gm.joined_at,gm.last_activity_seen_at from groups g join group_members gm on gm.group_id=g.id where gm.user_id=$1 order by gm.joined_at limit 1',[user.id])).rows[0]
   let unread=null
   if(group)unread=(await db.query('select count(*)::int count from activities where group_id=$1 and actor_id<>$2 and created_at>coalesce($3::timestamptz,$4::timestamptz)',[group.id,user.id,group.last_activity_seen_at,group.joined_at])).rows[0].count
   await db.query('rollback');console.log(JSON.stringify({email:user.email,group:group?.name,unread,ok:true}))
  }catch(error){await db.query('rollback').catch(()=>{});console.log(JSON.stringify({email:user.email,ok:false,code:error.code,error:error.message}))}
 }
}finally{await db.end().catch(()=>{})}
