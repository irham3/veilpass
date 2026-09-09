import { readFile } from "node:fs/promises";
import { Noir } from "@noir-lang/noir_js";
import { Barretenberg, UltraHonkBackend, UltraHonkVerifierBackend } from "@aztec/bb.js";

const circuit = JSON.parse(await readFile("public/proof/veilpass_membership.json", "utf8"));
const verificationKey = new Uint8Array(await readFile("public/proof/veilpass_membership.vk"));
const fixture = {
  subject_secret: "0x01",
  credential_salt: "0x07",
  credential_expiry: 1000,
  leaf_nonce: "0x04",
  merkle_path: Array.from({ length: 16 }, () => "0x00"),
  path_is_right: Array.from({ length: 16 }, () => false),
  credential_commitment: "0x2406e29284ceaaaa77cb4ea17473a925ad6b5c3985e074bae8e5bbff5dc86795",
  credential_root: "0x2d26eb53c6f8ce8083c60ba5a8135288478653f9396ba1d941d02060f3de3376",
  gate_id_hash: "0x02",
  epoch: 3,
  normalized_origin_hash: "0x05",
  challenge_hash: "0x06",
  proof_expiry: 900,
  current_time: 800,
  private_app_id: "0x0b43b49c6621ceea5d49c433ea712de1e8adaa80ef2778e005be35292853124b",
  login_nullifier: "0x2cec5513fb653232cf29b85688dabc039aec246538b6d66db0a03abfff7fd157",
  revocation_hash: "0x09",
};

const noir = new Noir(circuit);
await noir.init();
const execution = await noir.execute(fixture);
const api = await Barretenberg.new();
try {
  const proof = await new UltraHonkBackend(circuit.bytecode, api).generateProof(execution.witness);
  const verified = await new UltraHonkVerifierBackend(api).verifyProof({ ...proof, verificationKey });
  if (!verified) throw new Error("Pinned verification key rejected the generated membership proof");
  console.log(JSON.stringify({ proofBytes: proof.proof.byteLength, publicInputs: proof.publicInputs.length, verified }));
} finally {
  await api.destroy();
}
