// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProofWindow } from "./proof-window";

describe("ProofWindow", () => {
  it("shows the public wallet identifier only in standard login", () => {
    render(<ProofWindow />);

    const payload = screen.getByTestId("hero-payload");
    expect(payload).toHaveTextContent("walletAddress");
    expect(payload).toHaveTextContent("GBRP");

    fireEvent.click(screen.getByRole("button", { name: "VeilPass login" }));

    expect(payload).not.toHaveTextContent("walletAddress");
    expect(payload).toHaveTextContent("privateAppId");
    expect(payload).toHaveTextContent("vp_appA_72f1");
  });

  it("changes the private ID across app origins", () => {
    render(<ProofWindow />);
    fireEvent.click(screen.getByRole("button", { name: "VeilPass login" }));
    fireEvent.click(screen.getByRole("button", { name: "Use App B" }));

    const payload = screen.getByTestId("hero-payload");
    expect(payload).toHaveTextContent("vp_appB_19c8");
    expect(payload).not.toHaveTextContent("vp_appA_72f1");
    expect(screen.getByText("feedback.example.test")).toBeInTheDocument();
  });

  it("exposes its controls as a named region", () => {
    render(<ProofWindow />);

    const region = screen.getByRole("region", {
      name: "Login payload comparison",
    });
    expect(
      within(region).getByRole("button", { name: "Standard wallet login" }),
    ).toBeInTheDocument();
  });
});
