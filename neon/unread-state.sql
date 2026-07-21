BEGIN;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS last_activity_seen_at timestamptz NOT NULL DEFAULT now();
COMMIT;
