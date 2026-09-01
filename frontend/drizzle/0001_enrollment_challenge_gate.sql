ALTER TABLE "veilpass"."enrollment_challenges"
  ADD COLUMN IF NOT EXISTS "gate_id" text NOT NULL DEFAULT 'premium-holder';
