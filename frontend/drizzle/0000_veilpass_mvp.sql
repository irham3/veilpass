CREATE SCHEMA IF NOT EXISTS "veilpass";
CREATE TABLE IF NOT EXISTS "veilpass"."login_challenges" (
  "id" uuid PRIMARY KEY,
  "challenge_digest" text NOT NULL UNIQUE,
  "gate_id" text NOT NULL,
  "origin" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "spent_at" timestamptz
);
CREATE TABLE IF NOT EXISTS "veilpass"."login_nullifiers" (
  "digest" text PRIMARY KEY,
  "consumed_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "veilpass"."enrollment_challenges" (
  "id" uuid PRIMARY KEY,
  "address_digest" text NOT NULL,
  "message_digest" text NOT NULL,
  "gate_id" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "spent" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS "veilpass"."issuer_credentials" (
  "commitment" text PRIMARY KEY,
  "gate_id" text NOT NULL,
  "epoch" integer NOT NULL,
  "expires_at" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS "veilpass"."contract_sync_cursors" (
  "contract_id" text PRIMARY KEY,
  "ledger" integer NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "veilpass"."demo_sessions" (
  "token_digest" text PRIMARY KEY,
  "private_app_id" text NOT NULL,
  "gate_id" text NOT NULL,
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "login_challenge_expiry" ON "veilpass"."login_challenges" ("expires_at");
