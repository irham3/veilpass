// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Networks } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getNetwork, requestAccess, updateRoot, createGate, rotateEpoch, revoke, signAndSend } = vi.hoisted(() => ({
  getNetwork: vi.fn(), requestAccess: vi.fn(), updateRoot: vi.fn(), createGate: vi.fn(), rotateEpoch: vi.fn(), revoke: vi.fn(), signAndSend: vi.fn(),
}));
vi.mock("@stellar/freighter-api", () => ({ getNetwork, requestAccess, signTransaction: vi.fn() }));
vi.mock("@/packages/contract-bindings/src", () => ({ Client: class {
  update_root = updateRoot;
  create_gate = createGate;
  rotate_epoch = rotateEpoch;
  revoke = revoke;
} }));

import { ContractActions } from "./contract-actions";

const props = { contractId: "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK", rpcUrl: "https://soroban-testnet.stellar.org", configured: true };

beforeEach(() => {
  for (const fn of [getNetwork, requestAccess, updateRoot, createGate, rotateEpoch, revoke, signAndSend]) fn.mockReset();
  getNetwork.mockResolvedValue({ network: "TESTNET", networkPassphrase: Networks.TESTNET });
  requestAccess.mockResolvedValue({ address: "GTESTPUBLICADDRESS" });
  for (const fn of [updateRoot, createGate, rotateEpoch, revoke]) fn.mockResolvedValue({ signAndSend });
  signAndSend.mockResolvedValue({ result: { isErr: () => false }, sendTransactionResponse: { hash: "abc123" } });
});

describe("contract operation controls", () => {
  it("rejects invalid input before requesting wallet access", async () => {
    render(<ContractActions {...props} />);
    fireEvent.change(screen.getByLabelText("32-byte value (hex)"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Create gate with Freighter" }));
    expect(await screen.findByText("Enter exactly 32 bytes as hexadecimal")).toBeInTheDocument();
    expect(getNetwork).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("32-byte value (hex)"), { target: { value: "00".repeat(32) } });
    fireEvent.change(screen.getByLabelText("Current epoch"), { target: { value: "1junk" } });
    fireEvent.click(screen.getByRole("button", { name: "Create gate with Freighter" }));
    expect(await screen.findByText("Enter the gate's current epoch as a positive integer")).toBeInTheDocument();
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it("requires Freighter Testnet before wallet access", async () => {
    getNetwork.mockResolvedValue({ network: "PUBLIC", networkPassphrase: Networks.PUBLIC });
    render(<ContractActions {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Create gate with Freighter" }));
    expect(await screen.findByText("Switch Freighter to Stellar Testnet before submitting")).toBeInTheDocument();
    expect(requestAccess).not.toHaveBeenCalled();
  });

  it("confirms a successful root update and displays its transaction link", async () => {
    render(<ContractActions {...props} />);
    fireEvent.change(screen.getByLabelText("Gate ID"), { target: { value: " premium-holder " } });
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Update root" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Publish root at this epoch" }));
    await waitFor(() => expect(updateRoot).toHaveBeenCalledWith(expect.objectContaining({ gate_id: "premium-holder", expected_epoch: 1 })));
    expect(await screen.findByText("Confirmed on Stellar Testnet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "abc123" })).toHaveAttribute("href", "https://stellar.expert/explorer/testnet/tx/abc123");
  });

  it("does not claim confirmation when the contract rejects the transaction", async () => {
    signAndSend.mockResolvedValue({ result: { isErr: () => true }, sendTransactionResponse: { hash: "abc123" } });
    render(<ContractActions {...props} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Revoke" }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("button", { name: "Revoke credential with Freighter" }));
    expect(await screen.findByText("The contract rejected this Testnet transaction")).toBeInTheDocument();
    expect(screen.queryByText("Confirmed on Stellar Testnet")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "abc123" })).not.toBeInTheDocument();
  });
});
