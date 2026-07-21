import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED })

try {
  await client.connect()
  await client.query('begin')

  const users = await client.query(`
    select id, email from neon_auth."user"
    where email in ('demo-presentacion@losvatos.app', 'demo-friend@losvatos.invalid')
  `)
  const byEmail = new Map(users.rows.map((user) => [user.email, user.id]))
  const demoId = byEmail.get('demo-presentacion@losvatos.app')
  const friendId = byEmail.get('demo-friend@losvatos.invalid')
  if (!demoId || !friendId) throw new Error('Faltan los usuarios de autenticación de la demo')

  await client.query(`
    update public.profiles set
      display_name = case when id = $1 then 'Vato Demo' else 'Vato Explorador' end,
      username = case when id = $1 then 'vato.demo' else 'vato.explorador' end,
      onboarding_completed = true,
      updated_at = now()
    where id in ($1, $2)
  `, [demoId, friendId])

  await client.query('delete from public.group_members where user_id in ($1, $2)', [demoId, friendId])
  await client.query("delete from public.groups where is_demo = true and name = 'Demo · Los Vatos World Adventure'")
  const group = (await client.query(`
    insert into public.groups(name, created_by, is_demo)
    values ('Demo · Los Vatos World Adventure', $1, true)
    returning id
  `, [demoId])).rows[0]
  await client.query(`
    insert into public.group_members(group_id, user_id, role)
    values ($1, $2, 'admin'), ($1, $3, 'member')
  `, [group.id, demoId, friendId])

  const lisboa = (await client.query(`
    insert into public.stickers(group_id, activated_by, status, position, location_accuracy, public_city, public_country, activated_at, first_discovered_at)
    values ($1, $2, 'DISCOVERED', ST_SetSRID(ST_MakePoint(-9.1427, 38.7369), 4326)::geography, 8, 'Lisboa', 'Portugal', now() - interval '8 days', now() - interval '6 days')
    returning id
  `, [group.id, friendId])).rows[0]
  await client.query(`
    insert into public.sticker_content(sticker_id, title, story, message, photo_url, photo_kind)
    values ($1, 'Atardecer en Lisboa', 'Una parada junto al Tajo que terminó convirtiéndose en uno de esos recuerdos que siempre vuelven.', 'Si has llegado hasta aquí, mira hacia el río y haz una foto para recordar el momento.', 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=85', 'place')
  `, [lisboa.id])
  await client.query(`
    insert into public.discoveries(sticker_id, discovered_by, position, location_accuracy, distance_from_sticker, discovered_at)
    values ($1, $2, ST_SetSRID(ST_MakePoint(-9.14268, 38.73691), 4326)::geography, 7, 2.1, now() - interval '6 days')
  `, [lisboa.id, demoId])

  const granada = (await client.query(`
    insert into public.stickers(group_id, activated_by, status, position, location_accuracy, public_city, public_country, activated_at, first_discovered_at)
    values ($1, $2, 'DISCOVERED', ST_SetSRID(ST_MakePoint(-3.5881, 37.1761), 4326)::geography, 6, 'Granada', 'España', now() - interval '3 days', now() - interval '2 days')
    returning id
  `, [group.id, demoId])).rows[0]
  await client.query(`
    insert into public.sticker_content(sticker_id, title, story, message, photo_url, photo_kind)
    values ($1, 'Recuerdo de Granada', 'Una tarde recorriendo el Albaicín con la Alhambra al fondo y la ciudad encendida bajo nosotros.', '¡Bienvenido, vato! Este cromo ya forma parte de tu aventura.', 'https://images.unsplash.com/photo-1600100397608-f010f86b3381?auto=format&fit=crop&w=1200&q=85', 'place')
  `, [granada.id])
  await client.query(`
    insert into public.discoveries(sticker_id, discovered_by, position, location_accuracy, distance_from_sticker, discovered_at)
    values ($1, $2, ST_SetSRID(ST_MakePoint(-3.58808, 37.17612), 4326)::geography, 5, 2.7, now() - interval '2 days')
  `, [granada.id, friendId])

  await client.query(`
    insert into public.activities(group_id, actor_id, sticker_id, activity_type, metadata, created_at)
    values
      ($1, $2, $3, 'ACTIVATED', '{"city":"Lisboa"}', now() - interval '8 days'),
      ($1, $4, $3, 'FIRST_DISCOVERY', '{"city":"Lisboa"}', now() - interval '6 days'),
      ($1, $4, $5, 'ACTIVATED', '{"city":"Granada"}', now() - interval '3 days'),
      ($1, $2, $5, 'FIRST_DISCOVERY', '{"city":"Granada"}', now() - interval '2 days')
  `, [group.id, friendId, lisboa.id, demoId, granada.id])

  await client.query('commit')
  console.log(JSON.stringify({ seeded: true, stickers: 2 }))
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally {
  await client.end()
}
