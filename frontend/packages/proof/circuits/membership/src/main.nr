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
    credential_root: pub Field,
    gate_id_hash: pub Field,
    epoch: pub u32,
    normalized_origin_hash: pub Field,
    challenge_hash: pub Field,
    proof_expiry: pub u64,
    current_time: pub u64,
    private_app_id: pub Field,
    login_nullifier: pub Field,
    revocation_hash: pub Field,
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

#[test]
fn accepts_a_valid_membership_witness() {
    let subject_secret = 1;
    let gate_id_hash = 2;
    let epoch = 3;
    let credential_expiry = 1_000_u64;
    let leaf_nonce = 4;
    let path = [0; 16];
    let sides = [false; 16];
    let mut root = std::hash::pedersen_hash([subject_secret, gate_id_hash, epoch as Field, credential_expiry as Field, leaf_nonce]);
    for _ in 0..16 { root = h2(root, 0); }

    main(
        subject_secret,
        credential_expiry,
        leaf_nonce,
        path,
        sides,
        root,
        gate_id_hash,
        epoch,
        5,
        6,
        900,
        800,
        h3(subject_secret, gate_id_hash, 5),
        h2(subject_secret, 6),
        h3(subject_secret, gate_id_hash, 1),
    );
}
