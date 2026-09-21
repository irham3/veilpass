"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/docs")) {
    return <div className="min-h-full">{children}</div>;
  }

  return (
    <div key={pathname} className="route-transition min-h-full">
      {children}
    </div>
  );
}
