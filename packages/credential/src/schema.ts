import { z } from "zod";

export const issuedCredentialSchema = z.object({ gateId: z.string(), epoch: z.number().int().positive(), commitment: z.string(), credentialRoot: z.string(), expiresAt: z.string().datetime(), issuerPublicKey: z.string(), issuerSignature: z.string() }).strict();
export const storedCredentialSchema = issuedCredentialSchema.extend({ subjectSecret: z.string(), storedAt: z.string().datetime() }).strict();
export type IssuedCredential = z.infer<typeof issuedCredentialSchema>;
export type StoredCredential = z.infer<typeof storedCredentialSchema>;
