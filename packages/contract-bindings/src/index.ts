import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export const Errors = {
  1: {message:"GateExists"},
  2: {message:"GateMissing"},
  3: {message:"NotOwner"},
  4: {message:"StaleEpoch"}
}


export interface GateState {
  credential_root: Buffer;
  epoch: u32;
  owner: string;
  policy_hash: Buffer;
  updated_at: u64;
}





export interface Client {
  /**
   * Construct and simulate a revoke transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revoke: ({owner, gate_id, revocation_hash}: {owner: string, gate_id: string, revocation_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_gate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_gate: ({gate_id}: {gate_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<GateState>>>

  /**
   * Construct and simulate a is_revoked transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_revoked: ({gate_id, revocation_hash}: {gate_id: string, revocation_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a create_gate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_gate: ({owner, gate_id, policy_hash, root}: {owner: string, gate_id: string, policy_hash: Buffer, root: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<GateState>>>

  /**
   * Construct and simulate a update_root transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_root: ({owner, gate_id, expected_epoch, new_root}: {owner: string, gate_id: string, expected_epoch: u32, new_root: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<GateState>>>

  /**
   * Construct and simulate a rotate_epoch transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  rotate_epoch: ({owner, gate_id, new_root}: {owner: string, gate_id: string, new_root: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<GateState>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABAAAAAAAAAAKR2F0ZUV4aXN0cwAAAAAAAQAAAAAAAAALR2F0ZU1pc3NpbmcAAAAAAgAAAAAAAAAITm90T3duZXIAAAADAAAAAAAAAApTdGFsZUVwb2NoAAAAAAAE",
        "AAAAAQAAAAAAAAAAAAAACUdhdGVTdGF0ZQAAAAAAAAUAAAAAAAAAD2NyZWRlbnRpYWxfcm9vdAAAAAPuAAAAIAAAAAAAAAAFZXBvY2gAAAAAAAAEAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAC3BvbGljeV9oYXNoAAAAA+4AAAAgAAAAAAAAAAp1cGRhdGVkX2F0AAAAAAAG",
        "AAAABQAAAAAAAAAAAAAAC0dhdGVDcmVhdGVkAAAAAAEAAAAMZ2F0ZV9jcmVhdGVkAAAABAAAAAAAAAAHZ2F0ZV9pZAAAAAAQAAAAAQAAAAAAAAALcG9saWN5X2hhc2gAAAAD7gAAACAAAAAAAAAAAAAAAA9jcmVkZW50aWFsX3Jvb3QAAAAD7gAAACAAAAAAAAAAAAAAAAVlcG9jaAAAAAAAAAQAAAAAAAAAAg==",
        "AAAABQAAAAAAAAAAAAAAC1Jvb3RVcGRhdGVkAAAAAAEAAAAMcm9vdF91cGRhdGVkAAAAAwAAAAAAAAAHZ2F0ZV9pZAAAAAAQAAAAAQAAAAAAAAAPY3JlZGVudGlhbF9yb290AAAAA+4AAAAgAAAAAAAAAAAAAAAFZXBvY2gAAAAAAAAEAAAAAAAAAAI=",
        "AAAAAAAAAAAAAAAGcmV2b2tlAAAAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAB2dhdGVfaWQAAAAAEAAAAAAAAAAPcmV2b2NhdGlvbl9oYXNoAAAAA+4AAAAgAAAAAQAAA+kAAAACAAAAAw==",
        "AAAABQAAAAAAAAAAAAAADEVwb2NoUm90YXRlZAAAAAEAAAANZXBvY2hfcm90YXRlZAAAAAAAAAMAAAAAAAAAB2dhdGVfaWQAAAAAEAAAAAEAAAAAAAAAD2NyZWRlbnRpYWxfcm9vdAAAAAPuAAAAIAAAAAAAAAAAAAAABWVwb2NoAAAAAAAABAAAAAAAAAAC",
        "AAAAAAAAAAAAAAAIZ2V0X2dhdGUAAAABAAAAAAAAAAdnYXRlX2lkAAAAABAAAAABAAAD6QAAB9AAAAAJR2F0ZVN0YXRlAAAAAAAAAw==",
        "AAAAAAAAAAAAAAAKaXNfcmV2b2tlZAAAAAAAAgAAAAAAAAAHZ2F0ZV9pZAAAAAAQAAAAAAAAAA9yZXZvY2F0aW9uX2hhc2gAAAAD7gAAACAAAAABAAAAAQ==",
        "AAAAAAAAAAAAAAALY3JlYXRlX2dhdGUAAAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAdnYXRlX2lkAAAAABAAAAAAAAAAC3BvbGljeV9oYXNoAAAAA+4AAAAgAAAAAAAAAARyb290AAAD7gAAACAAAAABAAAD6QAAB9AAAAAJR2F0ZVN0YXRlAAAAAAAAAw==",
        "AAAAAAAAAAAAAAALdXBkYXRlX3Jvb3QAAAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAdnYXRlX2lkAAAAABAAAAAAAAAADmV4cGVjdGVkX2Vwb2NoAAAAAAAEAAAAAAAAAAhuZXdfcm9vdAAAA+4AAAAgAAAAAQAAA+kAAAfQAAAACUdhdGVTdGF0ZQAAAAAAAAM=",
        "AAAABQAAAAAAAAAAAAAAEUNyZWRlbnRpYWxSZXZva2VkAAAAAAAAAQAAABJjcmVkZW50aWFsX3Jldm9rZWQAAAAAAAIAAAAAAAAAB2dhdGVfaWQAAAAAEAAAAAEAAAAAAAAAD3Jldm9jYXRpb25faGFzaAAAAAPuAAAAIAAAAAAAAAAC",
        "AAAAAAAAAAAAAAAMcm90YXRlX2Vwb2NoAAAAAwAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAdnYXRlX2lkAAAAABAAAAAAAAAACG5ld19yb290AAAD7gAAACAAAAABAAAD6QAAB9AAAAAJR2F0ZVN0YXRlAAAAAAAAAw==" ]),
      options
    )
  }
  public readonly fromJSON = {
    revoke: this.txFromJSON<Result<void>>,
        get_gate: this.txFromJSON<Result<GateState>>,
        is_revoked: this.txFromJSON<boolean>,
        create_gate: this.txFromJSON<Result<GateState>>,
        update_root: this.txFromJSON<Result<GateState>>,
        rotate_epoch: this.txFromJSON<Result<GateState>>
  }
}