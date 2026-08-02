extern crate std;

use super::*;
use soroban_sdk::{testutils::{storage::Persistent as _, Address as _, Events}, Address, BytesN, Env, String};

fn bytes(env: &Env, value: u8) -> BytesN<32> { BytesN::from_array(env, &[value; 32]) }

#[test]
fn owner_controls_root_epoch_and_revocation() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(VeilPassGate, ());
    let client = VeilPassGateClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let outsider = Address::generate(&env);
    let gate = String::from_str(&env, "premium-holder");
    client.create_gate(&owner, &gate, &bytes(&env, 1), &bytes(&env, 2));
    assert_eq!(env.events().all().events().len(), 1);
    let created = client.get_gate(&gate);
    assert_eq!(created.owner, owner);
    assert_eq!(created.epoch, 1);
    assert_eq!(created.credential_root, bytes(&env, 2));
    assert_eq!(client.try_update_root(&outsider, &gate, &1, &bytes(&env, 3)), Err(Ok(Error::NotOwner)));
    client.update_root(&owner, &gate, &1, &bytes(&env, 3));
    assert_eq!(env.events().all().events().len(), 1);
    assert_eq!(client.get_gate(&gate).credential_root, bytes(&env, 3));
    client.rotate_epoch(&owner, &gate, &bytes(&env, 4));
    assert_eq!(env.events().all().events().len(), 1);
    assert_eq!(client.get_gate(&gate).epoch, 2);
    assert_eq!(client.try_update_root(&owner, &gate, &1, &bytes(&env, 5)), Err(Ok(Error::StaleEpoch)));
    let revocation = bytes(&env, 9);
    assert!(!client.is_revoked(&gate, &revocation));
    client.revoke(&owner, &gate, &revocation);
    assert_eq!(env.events().all().events().len(), 1);
    assert!(client.is_revoked(&gate, &revocation));
}

#[test]
fn duplicate_and_missing_gates_are_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(VeilPassGate, ());
    let client = VeilPassGateClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let gate = String::from_str(&env, "gate");
    client.create_gate(&owner, &gate, &bytes(&env, 1), &bytes(&env, 2));
    assert_eq!(client.try_create_gate(&owner, &gate, &bytes(&env, 1), &bytes(&env, 2)), Err(Ok(Error::GateExists)));
    let missing = String::from_str(&env, "missing");
    assert_eq!(client.try_get_gate(&missing), Err(Ok(Error::GateMissing)));
}

#[test]
fn writes_extend_persistent_storage_ttl() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(VeilPassGate, ());
    let client = VeilPassGateClient::new(&env, &contract_id);
    let owner = Address::generate(&env);
    let gate = String::from_str(&env, "ttl-gate");
    client.create_gate(&owner, &gate, &bytes(&env, 1), &bytes(&env, 2));
    let ttl = env.as_contract(&contract_id, || env.storage().persistent().get_ttl(&DataKey::Gate(gate)));
    assert!(ttl >= TTL_EXTEND_TO - 1);
}
