import { z } from "zod";

const field = z.string().regex(/^[a-f0-9]{64}$/);

export const credentialWitnessSchema = z.object({
  credentialRoot: field,
  leafIndex: z.number().int().min(0).max(65_535),
  leafNonce: field,
  merklePath: z.array(field).length(16),
  pathIsRight: z.array(z.boolean()).length(16),
  revocationHash: field,
}).strict();

export const issuedCredentialSchema = z.object({
  gateId: z.string(),
  epoch: z.number().int().positive(),
  commitment: field,
  credentialSalt: field,
  credentialRoot: field,
  leafNonce: field,
  merklePath: z.array(field).length(16),
  pathIsRight: z.array(z.boolean()).length(16),
  revocationHash: field,
  expiresAt: z.string().datetime(),
  issuerPublicKey: z.string(),
  issuerSignature: z.string(),
}).strict();
export const storedCredentialSchema = issuedCredentialSchema.extend({ subjectSecret: z.string(), storedAt: z.string().datetime() }).strict();
export type IssuedCredential = z.infer<typeof issuedCredentialSchema>;
export type StoredCredential = z.infer<typeof storedCredentialSchema>;
