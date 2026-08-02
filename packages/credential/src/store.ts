import { openDB } from "idb";

import { storedCredentialSchema, type StoredCredential } from "./schema";

const database = "veilpass-credential-v1";
const storeName = "credentials";

async function db() { return openDB(database, 1, { upgrade(databaseHandle) { databaseHandle.createObjectStore(storeName); } }); }
export async function saveCredential(credential: StoredCredential): Promise<void> { const parsed = storedCredentialSchema.parse(credential); await (await db()).put(storeName, parsed, parsed.gateId); }
export async function loadCredential(gateId: string): Promise<StoredCredential | null> { const value = await (await db()).get(storeName, gateId); const parsed = storedCredentialSchema.safeParse(value); return parsed.success ? parsed.data : null; }
export async function deleteCredential(gateId: string): Promise<void> { await (await db()).delete(storeName, gateId); }
