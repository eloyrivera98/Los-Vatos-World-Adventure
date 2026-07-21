BEGIN;
CREATE TABLE IF NOT EXISTS public.sticker_hint_unlocks (
  sticker_id uuid NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sticker_id, user_id)
);
CREATE INDEX IF NOT EXISTS sticker_hint_unlocks_user_idx ON public.sticker_hint_unlocks(user_id, unlocked_at DESC);
ALTER TABLE public.sticker_hint_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_sticker_hint_unlocks ON public.sticker_hint_unlocks;
CREATE POLICY own_sticker_hint_unlocks ON public.sticker_hint_unlocks FOR ALL USING(user_id=public.app_user_id()) WITH CHECK(user_id=public.app_user_id());
DROP POLICY IF EXISTS safe_stickers_read ON public.stickers;
CREATE POLICY safe_stickers_read ON public.stickers FOR SELECT USING(public.is_group_member(group_id));
CREATE OR REPLACE FUNCTION public.unlocked_hint_photo(wanted_sticker uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT sc.photo_url FROM public.sticker_content sc
  WHERE sc.sticker_id=wanted_sticker
    AND EXISTS(SELECT 1 FROM public.sticker_hint_unlocks hu WHERE hu.sticker_id=wanted_sticker AND hu.user_id=public.app_user_id())
$$;
COMMIT;
