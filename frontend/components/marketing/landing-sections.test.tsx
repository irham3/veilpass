// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/motion/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { LandingFaq } from "./landing-faq";
import { PayloadComparison } from "./payload-comparison";
import { PrivacyBoundary } from "./privacy-boundary";

describe("landing page information architecture", () => {
  it("exposes the privacy boundary as an ordered, honest three-party explanation", () => {
    render(<PrivacyBoundary />);

    expect(screen.getByRole("heading", { name: "Private to the host, honest about the rest." })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Issuer" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "VeilPass login" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Host dApp" })).toBeVisible();
    expect(screen.getByText(/does not provide network anonymity/i)).toBeVisible();
  });

  it("renders the payload comparison as a semantic table", () => {
    render(<PayloadComparison />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Host can learn" })).toBeVisible();
    expect(within(table).getByRole("rowheader", { name: "Stellar wallet address" })).toBeVisible();
    expect(within(table).getAllByLabelText("Not shared").length).toBeGreaterThan(0);
  });

  it("keeps one FAQ answer open at a time and exposes expanded state", () => {
    render(<LandingFaq />);

    const privacy = screen.getByRole("button", { name: "Does VeilPass make the user anonymous?" });
    const deployment = screen.getByRole("button", { name: "Can I deploy this from the frontend folder?" });
    expect(privacy).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(deployment);

    expect(privacy).toHaveAttribute("aria-expanded", "false");
    expect(deployment).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Set Vercel's Root Directory to frontend/)).toBeInTheDocument();

    fireEvent.click(deployment);
    expect(deployment).toHaveAttribute("aria-expanded", "false");
  });
});
