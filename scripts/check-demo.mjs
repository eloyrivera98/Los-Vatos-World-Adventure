import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED })

try {
  await client.connect()
  const result = await client.query(`
    select
      u.email,
      p.id,
      count(distinct gm.group_id)::int as groups,
      count(distinct s.id)::int as stickers,
      count(distinct d.id)::int as discoveries
    from neon_auth."user" u
    join public.profiles p on p.id = u.id
    left join public.group_members gm on gm.user_id = p.id
    left join public.stickers s on s.activated_by = p.id
    left join public.discoveries d on d.discovered_by = p.id
    where u.email in ('demo-presentacion@losvatos.app', 'demo-friend@losvatos.invalid')
    group by u.email, p.id
    order by u.email
  `)
  console.log(JSON.stringify(result.rows, null, 2))
  const isolation = await client.query(`
    select
      count(*) filter (where g.is_demo)::int as demo_groups,
      count(*) filter (where not g.is_demo)::int as production_groups,
      count(*) filter (where g.is_demo and u.email not in ('demo-presentacion@losvatos.app', 'demo-friend@losvatos.invalid'))::int as real_users_in_demo,
      count(*) filter (where not g.is_demo and u.email in ('demo-presentacion@losvatos.app', 'demo-friend@losvatos.invalid'))::int as demo_users_in_production
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join neon_auth."user" u on u.id = gm.user_id
  `)
  console.log(JSON.stringify(isolation.rows[0], null, 2))
} finally {
  await client.end()
}
