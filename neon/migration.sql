BEGIN;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN CREATE TYPE public.member_role AS ENUM ('admin','member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sticker_status AS ENUM ('HIDDEN','DISCOVERED','REMOVED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.activity_kind AS ENUM ('ACTIVATED','FIRST_DISCOVERY','DISCOVERED','EDITED','REMOVED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  username text UNIQUE CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,30}$'),
  avatar_url text,
  timezone text NOT NULL DEFAULT 'Europe/Madrid',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8),'hex'),
  created_by uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, role public.member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(group_id,user_id)
);
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12),'hex'), created_by uuid NOT NULL REFERENCES public.profiles(id),
  max_uses integer CHECK(max_uses IS NULL OR max_uses>0), use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  activated_by uuid NOT NULL REFERENCES public.profiles(id), status public.sticker_status NOT NULL DEFAULT 'HIDDEN',
  position geography(point,4326) NOT NULL, location_accuracy double precision NOT NULL CHECK(location_accuracy>=0),
  public_city text, public_country text, activated_at timestamptz NOT NULL DEFAULT now(), first_discovered_at timestamptz,
  removed_at timestamptz, archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='DISCOVERED' AND first_discovered_at IS NOT NULL) OR status<>'DISCOVERED')
);
CREATE TABLE IF NOT EXISTS public.sticker_content (
  sticker_id uuid PRIMARY KEY REFERENCES public.stickers(id) ON DELETE CASCADE,
  title text CHECK(title IS NULL OR char_length(title)<=100), story text CHECK(story IS NULL OR char_length(story)<=3000),
  message text CHECK(message IS NULL OR char_length(message)<=1000), photo_url text, photo_storage_key text,
  photo_kind text CHECK(photo_kind IS NULL OR photo_kind IN ('selfie','place','other')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sticker_id uuid NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  discovered_by uuid NOT NULL REFERENCES public.profiles(id), position geography(point,4326) NOT NULL,
  location_accuracy double precision NOT NULL CHECK(location_accuracy>=0), distance_from_sticker double precision NOT NULL CHECK(distance_from_sticker>=0),
  discovered_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sticker_id,discovered_by)
);
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id), sticker_id uuid REFERENCES public.stickers(id) ON DELETE CASCADE,
  activity_type public.activity_kind NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE, sticker_id uuid REFERENCES public.stickers(id) ON DELETE CASCADE,
  type text NOT NULL, title text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.scan_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE, action text NOT NULL CHECK(action IN ('ACTIVATE','DISCOVER')),
  position geography(point,4326), location_accuracy double precision, result text NOT NULL,
  ip_hash text, attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stickers_position_gix ON public.stickers USING gist(position);
CREATE INDEX IF NOT EXISTS stickers_group_status_idx ON public.stickers(group_id,status);
CREATE INDEX IF NOT EXISTS stickers_activated_by_idx ON public.stickers(activated_by);
CREATE INDEX IF NOT EXISTS discoveries_position_gix ON public.discoveries USING gist(position);
CREATE INDEX IF NOT EXISTS discoveries_user_idx ON public.discoveries(discovered_by,discovered_at DESC);
CREATE INDEX IF NOT EXISTS activities_group_created_idx ON public.activities(group_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id,created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS scan_attempts_rate_idx ON public.scan_attempts(user_id,attempted_at DESC);

CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(coalesce(current_setting('request.jwt.claim.sub',true),current_setting('app.user_id',true)),'')::uuid
$$;
CREATE OR REPLACE FUNCTION public.is_group_member(wanted_group uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.group_members gm WHERE gm.group_id=wanted_group AND gm.user_id=public.app_user_id())
$$;
CREATE OR REPLACE FUNCTION public.sync_auth_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name,avatar_url) VALUES(NEW.id,coalesce(nullif(NEW.name,''),split_part(NEW.email,'@',1),'Vato'),NEW.image)
 ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_url=coalesce(EXCLUDED.avatar_url,public.profiles.avatar_url),updated_at=now(); RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_neon_auth_profile ON neon_auth."user";
CREATE TRIGGER sync_neon_auth_profile AFTER INSERT OR UPDATE OF name,image ON neon_auth."user" FOR EACH ROW EXECUTE FUNCTION public.sync_auth_profile();
INSERT INTO public.profiles(id,display_name,avatar_url)
 SELECT id,coalesce(nullif(name,''),split_part(email,'@',1),'Vato'),image FROM neon_auth."user"
 ON CONFLICT(id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.validate_discovery() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id uuid;
BEGIN SELECT activated_by INTO owner_id FROM public.stickers WHERE id=NEW.sticker_id FOR UPDATE;
 IF owner_id=NEW.discovered_by THEN RAISE EXCEPTION 'No puedes descubrir tu propio cromo'; END IF;
 UPDATE public.stickers SET status='DISCOVERED',first_discovered_at=coalesce(first_discovered_at,NEW.discovered_at),updated_at=now() WHERE id=NEW.sticker_id AND status='HIDDEN';
 RETURN NEW; END $$;
DROP TRIGGER IF EXISTS validate_discovery_trigger ON public.discoveries;
CREATE TRIGGER validate_discovery_trigger BEFORE INSERT ON public.discoveries FOR EACH ROW EXECUTE FUNCTION public.validate_discovery();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY; ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY; ALTER TABLE public.sticker_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discoveries ENABLE ROW LEVEL SECURITY; ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY; ALTER TABLE public.scan_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_authenticated_read ON public.profiles;
CREATE POLICY profiles_authenticated_read ON public.profiles FOR SELECT USING(public.app_user_id() IS NOT NULL);
DROP POLICY IF EXISTS own_profile_update ON public.profiles;
CREATE POLICY own_profile_update ON public.profiles FOR UPDATE USING(id=public.app_user_id()) WITH CHECK(id=public.app_user_id());
DROP POLICY IF EXISTS member_groups_read ON public.groups;
CREATE POLICY member_groups_read ON public.groups FOR SELECT USING(public.is_group_member(id));
DROP POLICY IF EXISTS memberships_read ON public.group_members;
CREATE POLICY memberships_read ON public.group_members FOR SELECT USING(public.is_group_member(group_id));
DROP POLICY IF EXISTS safe_stickers_read ON public.stickers;
CREATE POLICY safe_stickers_read ON public.stickers FOR SELECT USING(public.is_group_member(group_id) AND (status<>'HIDDEN' OR activated_by=public.app_user_id()));
DROP POLICY IF EXISTS stickers_insert ON public.stickers;
CREATE POLICY stickers_insert ON public.stickers FOR INSERT WITH CHECK(public.is_group_member(group_id) AND activated_by=public.app_user_id() AND status='HIDDEN');
DROP POLICY IF EXISTS collector_content_read ON public.sticker_content;
CREATE POLICY collector_content_read ON public.sticker_content FOR SELECT USING(EXISTS(SELECT 1 FROM public.stickers s WHERE s.id=sticker_id AND (s.activated_by=public.app_user_id() OR EXISTS(SELECT 1 FROM public.discoveries d WHERE d.sticker_id=s.id AND d.discovered_by=public.app_user_id()))));
DROP POLICY IF EXISTS activator_content_write ON public.sticker_content;
CREATE POLICY activator_content_write ON public.sticker_content FOR ALL USING(EXISTS(SELECT 1 FROM public.stickers s WHERE s.id=sticker_id AND s.activated_by=public.app_user_id())) WITH CHECK(EXISTS(SELECT 1 FROM public.stickers s WHERE s.id=sticker_id AND s.activated_by=public.app_user_id()));
DROP POLICY IF EXISTS discoveries_read ON public.discoveries;
CREATE POLICY discoveries_read ON public.discoveries FOR SELECT USING(EXISTS(SELECT 1 FROM public.stickers s WHERE s.id=sticker_id AND public.is_group_member(s.group_id) AND s.status<>'HIDDEN'));
DROP POLICY IF EXISTS activities_read ON public.activities;
CREATE POLICY activities_read ON public.activities FOR SELECT USING(public.is_group_member(group_id));
DROP POLICY IF EXISTS own_notifications ON public.notifications;
CREATE POLICY own_notifications ON public.notifications FOR ALL USING(user_id=public.app_user_id()) WITH CHECK(user_id=public.app_user_id());
DROP POLICY IF EXISTS own_scan_attempts ON public.scan_attempts;
CREATE POLICY own_scan_attempts ON public.scan_attempts FOR SELECT USING(user_id=public.app_user_id());
COMMIT;