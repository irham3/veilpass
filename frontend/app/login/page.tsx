import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoginSurface } from "@/components/login/login-surface";
import { normalizeOrigin } from "@/packages/shared/src/origin";

export const metadata: Metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const gateId = typeof query.gateId === "string" ? query.gateId : "";
  const state = typeof query.state === "string" ? query.state : "";
  let hostOrigin = "";
  try { hostOrigin = normalizeOrigin(typeof query.hostOrigin === "string" ? query.hostOrigin : ""); } catch { notFound(); }
  if (!gateId || !state) notFound();
  return <LoginSurface gateId={gateId} state={state} hostOrigin={hostOrigin} />;
}
