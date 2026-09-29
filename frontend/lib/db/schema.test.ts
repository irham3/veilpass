import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { contractSyncCursors, credentialMerkleCredentials, credentialTreeNodes, demoAssetClaims, demoAssetClaimChallenges, demoSessions, enrollmentChallenges, issuerCredentials, loginChallenges, loginNullifiers } from "./schema";

describe("durable VeilPass schema", () => {
  it("maps every durable store to the intended namespaced table", () => {
    expect([loginChallenges, loginNullifiers, enrollmentChallenges, demoAssetClaimChallenges, demoAssetClaims, issuerCredentials, credentialMerkleCredentials, credentialTreeNodes, demoSessions, contractSyncCursors].map(getTableName)).toEqual([
      "login_challenges", "login_nullifiers", "enrollment_challenges", "demo_asset_claim_challenges", "demo_asset_claims", "issuer_credentials", "credential_merkle_credentials", "credential_tree_nodes", "demo_sessions", "contract_sync_cursors",
    ]);
  });

  it("enforces compound keys for credential leaves and Merkle tree nodes", () => {
    expect(getTableConfig(credentialMerkleCredentials).primaryKeys[0]?.columns.map(({ name }) => name)).toEqual(["gate_id", "commitment"]);
    expect(getTableConfig(credentialTreeNodes).primaryKeys[0]?.columns.map(({ name }) => name)).toEqual(["gate_id", "level", "node_index"]);
  });
});
