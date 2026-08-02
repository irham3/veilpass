fn h2(a: Field, b: Field) -> Field {
    std::hash::pedersen_hash([a, b])
}

fn h3(a: Field, b: Field, c: Field) -> Field {
    std::hash::pedersen_hash([a, b, c])
}

fn main(
    subject_secret: Field,
    credential_expiry: u64,
    leaf_nonce: Field,
    merkle_path: [Field; 16],
    path_is_right: [bool; 16],
    pub credential_root: Field,
    pub gate_id_hash: Field,
    pub epoch: u32,
    pub normalized_origin_hash: Field,
    pub challenge_hash: Field,
    pub proof_expiry: u64,
    pub current_time: u64,
    pub private_app_id: Field,
    pub login_nullifier: Field,
    pub revocation_hash: Field,
) {
    assert(credential_expiry >= current_time);
    assert(proof_expiry >= current_time);
    assert(proof_expiry <= credential_expiry);

    let mut current = std::hash::pedersen_hash([
        subject_secret,
        gate_id_hash,
        epoch as Field,
        credential_expiry as Field,
        leaf_nonce,
    ]);
    for i in 0..16 {
        current = if path_is_right[i] { h2(merkle_path[i], current) } else { h2(current, merkle_path[i]) };
    }
    assert_eq(current, credential_root);
    assert_eq(private_app_id, h3(subject_secret, gate_id_hash, normalized_origin_hash));
    assert_eq(login_nullifier, h2(subject_secret, challenge_hash));
    assert_eq(revocation_hash, h3(subject_secret, gate_id_hash, 1));
}
