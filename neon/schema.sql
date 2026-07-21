create extension if not exists postgis;

create type public.member_role as enum ('admin', 'member');
create type public.sticker_status as enum ('HIDDEN', 'DISCOVERED', 'REMOVED', 'ARCHIVED');

create table public.profiles (
  id uuid primary key,
  display_name text not null,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

create table public.stickers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  activated_by uuid not null references public.profiles,
  status public.sticker_status not null default 'HIDDEN',
  position geography(point, 4326) not null,
  location_accuracy double precision not null check (location_accuracy >= 0),
  title text,
  story text,
  photo_url text,
  activated_at timestamptz not null default now(),
  first_discovered_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stickers_position_gix on public.stickers using gist(position);
create index stickers_group_status_idx on public.stickers(group_id, status);

create table public.discoveries (
  id uuid primary key default gen_random_uuid(),
  sticker_id uuid not null references public.stickers on delete cascade,
  discovered_by uuid not null references public.profiles,
  position geography(point, 4326) not null,
  location_accuracy double precision not null check (location_accuracy >= 0),
  distance_from_sticker double precision not null check (distance_from_sticker >= 0),
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(sticker_id, discovered_by)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  actor_id uuid not null references public.profiles,
  sticker_id uuid references public.stickers on delete cascade,
  activity_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  group_id uuid not null references public.groups on delete cascade,
  sticker_id uuid references public.stickers on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.stickers enable row level security;
alter table public.discoveries enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;

-- La API debe ejecutar set_config('app.user_id', user_id, true) al iniciar cada transacción.
-- El alcance local evita fugas de identidad al reutilizar conexiones del pool de Neon.
create function public.current_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$;

create function public.is_group_member(wanted_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.group_members where group_id = wanted_group and user_id = public.current_user_id());
$$;

create policy "profiles visible with server identity" on public.profiles for select using (public.current_user_id() is not null);
create policy "members read their groups" on public.groups for select using (public.is_group_member(id));
create policy "members read memberships" on public.group_members for select using (public.is_group_member(group_id));
create policy "safe sticker reads" on public.stickers for select
  using (public.is_group_member(group_id) and (status <> 'HIDDEN' or activated_by = public.current_user_id()));
create policy "members activate stickers" on public.stickers for insert
  with check (public.is_group_member(group_id) and activated_by = public.current_user_id() and status = 'HIDDEN');
create policy "members read discovery history" on public.discoveries for select
  using (exists(select 1 from public.stickers s where s.id = sticker_id and public.is_group_member(s.group_id) and (s.status <> 'HIDDEN' or s.activated_by = public.current_user_id())));
create policy "members read safe activities" on public.activities for select using (public.is_group_member(group_id));
create policy "users read own notifications" on public.notifications for select using (user_id = public.current_user_id());


-- El contenido del cromo se separa de su ubicación pública. Aunque el punto del mapa
-- ya sea visible, foto, selfie, historia y mensaje solo se entregan al activador o a
-- usuarios que tengan un descubrimiento válido (su colección).
create table public.sticker_content (
  sticker_id uuid primary key references public.stickers on delete cascade,
  message text,
  story text,
  photo_url text,
  photo_kind text check (photo_kind in ('selfie', 'place', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sticker_content enable row level security;

create policy "collectors reveal sticker content" on public.sticker_content for select
  using (exists (
    select 1 from public.stickers s
    where s.id = sticker_id and (
      s.activated_by = public.current_user_id()
      or exists (
        select 1 from public.discoveries d
        where d.sticker_id = s.id and d.discovered_by = public.current_user_id()
      )
    )
  ));

create policy "activators create sticker content" on public.sticker_content for insert
  with check (exists (
    select 1 from public.stickers s
    where s.id = sticker_id and s.activated_by = public.current_user_id()
  ));
-- Los INSERT de descubrimientos y el cambio HIDDEN -> DISCOVERED se realizan únicamente
-- mediante una función SECURITY DEFINER auditada. No se concede INSERT directo al cliente.
-- Esa función debe bloquear la fila candidata, verificar precisión/radio, excluir al creador,
-- detectar ambigüedad y escribir descubrimiento, actividad y notificaciones en una transacción.

