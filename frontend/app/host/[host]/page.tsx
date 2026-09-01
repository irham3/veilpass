import { notFound } from "next/navigation";

import { HostDemo } from "@/components/demo/host-demo";

const hostApps = {
  "app-a": { label: "App A", purpose: "Holder dashboard", accent: "Members who meet the gate can view their private dashboard." },
  "app-b": { label: "App B", purpose: "Private feedback", accent: "The same credential creates a different host-local identifier here." },
} as const;

export default async function HostPage({ params }: { params: Promise<{ host: string }> }) {
  const { host } = await params;
  if (!(host in hostApps)) notFound();
  return <HostDemo app={host as keyof typeof hostApps} {...hostApps[host as keyof typeof hostApps]} />;
}
