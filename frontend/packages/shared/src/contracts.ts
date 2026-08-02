import { z } from "zod";

export const VEILPASS_ERROR_CODES = [
  "WALLET_NOT_FOUND",
  "WRONG_NETWORK",
  "USER_REJECTED",
  "NOT_ELIGIBLE",
  "CHALLENGE_EXPIRED",
  "CHALLENGE_SPENT",
  "ORIGIN_MISMATCH",
  "GATE_MISMATCH",
  "STALE_EPOCH",
  "CREDENTIAL_EXPIRED",
  "CREDENTIAL_REVOKED",
  "PROOF_INVALID",
  "SERVICE_UNAVAILABLE",
] as const;

export const veilPassErrorCodeSchema = z.enum(VEILPASS_ERROR_CODES);

export const publicInputsSchema = z
  .object({
    gateId: z.string().min(1).max(128),
    epoch: z.number().int().nonnegative(),
    origin: z.string().min(1).max(512),
    challengeHash: z.string().min(1).max(256),
    credentialRoot: z.string().min(1).max(256),
    privateAppId: z.string().min(1).max(256),
    loginNullifier: z.string().min(1).max(256),
    revocationHash: z.string().min(1).max(256),
    proofExpiresAt: z.string().datetime(),
  })
  .strict();

export const proofResultSchema = z
  .object({
    challengeId: z.string().min(1).max(128),
    proof: z.string().min(1).max(1_500_000),
    publicInputs: publicInputsSchema,
  })
  .strict();

export const verifiedLoginSchema = z
  .object({
    ok: z.literal(true),
    privateAppId: z.string().min(1).max(256),
    gateId: z.string().min(1).max(128),
    epoch: z.number().int().nonnegative(),
    origin: z.string().min(1).max(512),
    expiresAt: z.string().datetime(),
  })
  .strict();

export const verifyErrorSchema = z
  .object({
    ok: z.literal(false),
    error: veilPassErrorCodeSchema,
    requestId: z.string().min(1).max(128),
  })
  .strict();

export const verifyResultSchema = z.discriminatedUnion("ok", [
  verifiedLoginSchema,
  verifyErrorSchema,
]);

export const challengeResponseSchema = z
  .object({
    challengeId: z.string().min(1).max(128),
    challenge: z.string().min(1).max(512),
    origin: z.string().min(1).max(512),
    gateId: z.string().min(1).max(128),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type VeilPassErrorCode = z.infer<typeof veilPassErrorCodeSchema>;
export type PublicInputs = z.infer<typeof publicInputsSchema>;
export type ProofResult = z.infer<typeof proofResultSchema>;
export type VerifiedLogin = z.infer<typeof verifiedLoginSchema>;
export type VerifyResult = z.infer<typeof verifyResultSchema>;
export type ChallengeResponse = z.infer<typeof challengeResponseSchema>;
