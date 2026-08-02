import Link from "next/link";

import { EnrollmentFlow } from "@/components/enrollment/enrollment-flow";
import { SiteHeader } from "@/components/site-header";

export default function EnrollPage() { return <div className="paper-theme min-h-screen bg-background text-foreground"><div className="[&>header]:bg-ink-950"><SiteHeader /></div><main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20"><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Back to dashboard</Link><div className="mt-7"><EnrollmentFlow /></div></main></div>; }
