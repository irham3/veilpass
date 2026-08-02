import { boolean, integer, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const veilpass = pgSchema("veilpass");
export const loginChallenges = veilpass.table("login_challenges", { id: uuid("id").primaryKey(), challengeDigest: text("challenge_digest").notNull().unique(), gateId: text("gate_id").notNull(), origin: text("origin").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), spentAt: timestamp("spent_at", { withTimezone: true }) });
export const loginNullifiers = veilpass.table("login_nullifiers", { digest: text("digest").primaryKey(), consumedAt: timestamp("consumed_at", { withTimezone: true }).notNull().defaultNow() });
export const enrollmentChallenges = veilpass.table("enrollment_challenges", { id: uuid("id").primaryKey(), addressDigest: text("address_digest").notNull(), messageDigest: text("message_digest").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), spent: boolean("spent").notNull().default(false) });
export const issuerCredentials = veilpass.table("issuer_credentials", { commitment: text("commitment").primaryKey(), gateId: text("gate_id").notNull(), epoch: integer("epoch").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull() });
export const demoSessions = veilpass.table("demo_sessions", { tokenDigest: text("token_digest").primaryKey(), privateAppId: text("private_app_id").notNull(), gateId: text("gate_id").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull() });
export const contractSyncCursors = veilpass.table("contract_sync_cursors", { contractId: text("contract_id").primaryKey(), ledger: integer("ledger").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() });
