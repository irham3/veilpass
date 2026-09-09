CREATE TABLE IF NOT EXISTS "veilpass"."credential_merkle_credentials" (
  "gate_id" text NOT NULL,
  "commitment" text NOT NULL,
  "epoch" integer NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "credential_salt" text NOT NULL,
  "leaf_nonce" text NOT NULL,
  "revocation_hash" text NOT NULL,
  "leaf_index" integer NOT NULL,
  "credential_root" text NOT NULL,
  PRIMARY KEY ("gate_id", "commitment"),
  UNIQUE ("gate_id", "leaf_index"),
  UNIQUE ("gate_id", "revocation_hash")
);

CREATE TABLE IF NOT EXISTS "veilpass"."credential_tree_nodes" (
  "gate_id" text NOT NULL,
  "level" integer NOT NULL CHECK ("level" >= 0 AND "level" <= 16),
  "node_index" integer NOT NULL CHECK ("node_index" >= 0),
  "node_value" text NOT NULL,
  PRIMARY KEY ("gate_id", "level", "node_index")
);

CREATE INDEX IF NOT EXISTS "credential_merkle_expiry" ON "veilpass"."credential_merkle_credentials" ("expires_at");
