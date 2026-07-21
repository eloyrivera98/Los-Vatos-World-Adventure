BEGIN;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.sync_auth_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE main_group uuid;
BEGIN
 INSERT INTO public.profiles(id,display_name,avatar_url) VALUES(NEW.id,coalesce(nullif(NEW.name,''),split_part(NEW.email,'@',1),'Vato'),NEW.image)
 ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,avatar_url=coalesce(EXCLUDED.avatar_url,public.profiles.avatar_url),updated_at=now();
 IF NEW.email <> 'demo-presentacion@losvatos.app' AND NEW.email NOT LIKE 'demo-%@losvatos.invalid' THEN
   SELECT id INTO main_group FROM public.groups WHERE is_demo=false ORDER BY created_at LIMIT 1;
   IF main_group IS NOT NULL THEN INSERT INTO public.group_members(group_id,user_id,role) VALUES(main_group,NEW.id,'member') ON CONFLICT(group_id,user_id) DO NOTHING; END IF;
 END IF;
 RETURN NEW;
END $$;
INSERT INTO public.group_members(group_id,user_id,role)
 SELECT g.id,p.id,'member'::public.member_role FROM public.profiles p CROSS JOIN LATERAL (SELECT id FROM public.groups WHERE is_demo=false ORDER BY created_at LIMIT 1) g
 JOIN neon_auth."user" u ON u.id=p.id
 WHERE u.email <> 'demo-presentacion@losvatos.app' AND u.email NOT LIKE 'demo-%@losvatos.invalid'
 ON CONFLICT(group_id,user_id) DO NOTHING;
COMMIT;