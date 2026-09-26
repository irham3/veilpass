import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { HostDemo, notFound } = vi.hoisted(() => ({ HostDemo: vi.fn((props: { label: string }) => <div>{props.label}</div>), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/components/demo/host-demo", () => ({ HostDemo }));
vi.mock("next/navigation", () => ({ notFound }));

import HostPage from "./page";

describe("private host routes", () => {
  it("renders the matching controlled app fixture", async () => {
    const page = await HostPage({ params: Promise.resolve({ host: "app-b" }) });
    expect(renderToStaticMarkup(page)).toContain("App B");
    expect(HostDemo).toHaveBeenLastCalledWith(expect.objectContaining({ label: "App B" }), undefined);
  });

  it("does not accept an unrecognized host identifier", async () => {
    await expect(HostPage({ params: Promise.resolve({ host: "app-c" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
