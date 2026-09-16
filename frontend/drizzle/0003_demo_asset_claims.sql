CREATE TABLE IF NOT EXISTS "veilpass"."demo_asset_claim_challenges" (
  "id" uuid PRIMARY KEY,
  "address_digest" text NOT NULL,
  "message_digest" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "spent" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "veilpass"."demo_asset_claims" (
  "address_digest" text PRIMARY KEY,
  "status" text NOT NULL CHECK ("status" IN ('pending', 'issued', 'unknown')),
  "reservation_id" uuid NOT NULL,
  "transaction_hash" text,
  "reserved_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "demo_asset_claim_reservation" ON "veilpass"."demo_asset_claims" ("reserved_at");
