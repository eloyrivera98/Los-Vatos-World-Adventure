BEGIN;
ALTER TABLE public.stickers ADD COLUMN IF NOT EXISTS sticker_number integer;
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY group_id ORDER BY activated_at, created_at, id)::integer AS number
  FROM public.stickers
)
UPDATE public.stickers s SET sticker_number=ranked.number FROM ranked WHERE ranked.id=s.id AND s.sticker_number IS NULL;
ALTER TABLE public.stickers ALTER COLUMN sticker_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stickers_group_number_uidx ON public.stickers(group_id,sticker_number);
CREATE OR REPLACE FUNCTION public.assign_sticker_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sticker_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.group_id::text,0));
    SELECT coalesce(max(sticker_number),0)+1 INTO NEW.sticker_number FROM public.stickers WHERE group_id=NEW.group_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assign_sticker_number_trigger ON public.stickers;
CREATE TRIGGER assign_sticker_number_trigger BEFORE INSERT ON public.stickers FOR EACH ROW EXECUTE FUNCTION public.assign_sticker_number();
COMMIT;