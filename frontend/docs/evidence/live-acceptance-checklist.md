# Live acceptance checklist

This checklist is the remaining operator-controlled portion of the delivery. It is deliberately separate from source implementation because it requires the Testnet gate owner's signing key, a real PostgreSQL service, and a user-approved Freighter wallet action.

1. Provision PostgreSQL and apply `drizzle/0000_veilpass_mvp.sql`, `drizzle/0001_enrollment_challenge_gate.sql`, and `drizzle/0002_credential_merkle_tree.sql` in order.
2. Configure `DATABASE_URL`, `VEILPASS_ISSUER_SECRET`, and the separately scoped `VEILPASS_GATE_OWNER_SECRET` only in the VeilPass login service. Do not put either secret in a `NEXT_PUBLIC_` variable.
3. As the on-chain gate owner, call `update_root` for `premium-holder` at its current epoch with `00` repeated 32 bytes. This establishes the empty sparse-Merkle-tree root. The dashboard's **Update root** tab provides the Freighter path; the service root publisher can then publish each issued root.
4. Deploy three independent HTTPS origins: the VeilPass login service, App A, and App B. Set each host's exact `VEILPASS_HOST_ORIGIN` / `VEILPASS_LOGIN_ORIGIN` values and explicit host allowlist; never use wildcard origins.
5. In Freighter on Stellar Testnet, add the configured VPT trustline and fund the holder account. The holder must approve the enrollment message itself.
6. Enroll once. Confirm the new contract root event, issued credential, and durable tree records. Enroll a second test account and confirm the first browser refreshes its Merkle witness before login.
7. Log in to App A twice and App B once. Confirm App A returns the same private app ID, App B returns a different one, and neither host response contains a Stellar address.
8. Replay the prior proof and confirm `CHALLENGE_SPENT`; wait until the challenge expires and confirm rejection; revoke the issued `revocationHash` on the contract and confirm `CREDENTIAL_REVOKED`.
9. Record this exact flow over the public HTTPS origins for the final short review video. Redact wallet secrets and service environment values.

The repository validates the code path locally. These steps are not automatable without exposing the gate-owner/service secrets or bypassing the Freighter user's explicit wallet approval.
