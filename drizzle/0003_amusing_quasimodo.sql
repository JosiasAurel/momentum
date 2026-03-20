ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_profile_public" boolean DEFAULT false NOT NULL;
