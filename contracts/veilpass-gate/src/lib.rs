#![no_std]

use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env, String};

const TTL_THRESHOLD: u32 = 17_280;
const TTL_EXTEND_TO: u32 = 120_960;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GateState { pub owner: Address, pub policy_hash: BytesN<32>, pub credential_root: BytesN<32>, pub epoch: u32, pub updated_at: u64 }

#[contracttype]
#[derive(Clone)]
enum DataKey { Gate(String), Revoked(String, BytesN<32>) }

#[contractevent]
pub struct GateCreated { #[topic] pub gate_id: String, pub policy_hash: BytesN<32>, pub credential_root: BytesN<32>, pub epoch: u32 }
#[contractevent]
pub struct RootUpdated { #[topic] pub gate_id: String, pub credential_root: BytesN<32>, pub epoch: u32 }
#[contractevent]
pub struct EpochRotated { #[topic] pub gate_id: String, pub credential_root: BytesN<32>, pub epoch: u32 }
#[contractevent]
pub struct CredentialRevoked { #[topic] pub gate_id: String, pub revocation_hash: BytesN<32> }

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error { GateExists = 1, GateMissing = 2, NotOwner = 3, StaleEpoch = 4 }

#[contract]
pub struct VeilPassGate;

#[contractimpl]
impl VeilPassGate {
    pub fn create_gate(env: Env, owner: Address, gate_id: String, policy_hash: BytesN<32>, root: BytesN<32>) -> Result<GateState, Error> {
        owner.require_auth();
        let key = DataKey::Gate(gate_id.clone());
        if env.storage().persistent().has(&key) { return Err(Error::GateExists); }
        let state = GateState { owner: owner.clone(), policy_hash: policy_hash.clone(), credential_root: root.clone(), epoch: 1, updated_at: env.ledger().timestamp() };
        env.storage().persistent().set(&key, &state);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        GateCreated { gate_id, policy_hash, credential_root: root, epoch: 1 }.publish(&env);
        Ok(state)
    }

    pub fn update_root(env: Env, owner: Address, gate_id: String, expected_epoch: u32, new_root: BytesN<32>) -> Result<GateState, Error> {
        let key = DataKey::Gate(gate_id.clone());
        let mut state: GateState = env.storage().persistent().get(&key).ok_or(Error::GateMissing)?;
        authorize(&owner, &state)?;
        if state.epoch != expected_epoch { return Err(Error::StaleEpoch); }
        state.credential_root = new_root.clone(); state.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &state); env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        RootUpdated { gate_id, credential_root: new_root, epoch: state.epoch }.publish(&env);
        Ok(state)
    }

    pub fn rotate_epoch(env: Env, owner: Address, gate_id: String, new_root: BytesN<32>) -> Result<GateState, Error> {
        let key = DataKey::Gate(gate_id.clone());
        let mut state: GateState = env.storage().persistent().get(&key).ok_or(Error::GateMissing)?;
        authorize(&owner, &state)?;
        state.epoch = state.epoch.checked_add(1).ok_or(Error::StaleEpoch)?; state.credential_root = new_root.clone(); state.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &state); env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        EpochRotated { gate_id, credential_root: new_root, epoch: state.epoch }.publish(&env);
        Ok(state)
    }

    pub fn revoke(env: Env, owner: Address, gate_id: String, revocation_hash: BytesN<32>) -> Result<(), Error> {
        let gate_key = DataKey::Gate(gate_id.clone());
        let state: GateState = env.storage().persistent().get(&gate_key).ok_or(Error::GateMissing)?;
        authorize(&owner, &state)?;
        let key = DataKey::Revoked(gate_id.clone(), revocation_hash.clone());
        env.storage().persistent().set(&key, &true); env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        env.storage().persistent().extend_ttl(&gate_key, TTL_THRESHOLD, TTL_EXTEND_TO);
        CredentialRevoked { gate_id, revocation_hash }.publish(&env);
        Ok(())
    }

    pub fn get_gate(env: Env, gate_id: String) -> Result<GateState, Error> {
        let key = DataKey::Gate(gate_id);
        let state = env.storage().persistent().get(&key).ok_or(Error::GateMissing)?;
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        Ok(state)
    }

    pub fn is_revoked(env: Env, gate_id: String, revocation_hash: BytesN<32>) -> bool {
        let key = DataKey::Revoked(gate_id, revocation_hash);
        let revoked = env.storage().persistent().get(&key).unwrap_or(false);
        if revoked { env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO); }
        revoked
    }
}

fn authorize(owner: &Address, state: &GateState) -> Result<(), Error> { owner.require_auth(); if owner != &state.owner { return Err(Error::NotOwner); } Ok(()) }

#[cfg(test)]
mod test;
