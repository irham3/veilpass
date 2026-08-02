import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { connection } from "next/server";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://veilpass.test"),
  applicationName: "VeilPass",
  title: "VeilPass | Private wallet login for Stellar dApps",
  description:
    "Verify wallet eligibility and recognize returning users without sending the Stellar address to the host dApp.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sign in with your wallet. Keep your address to yourself.",
    description:
      "Test VeilPass on Stellar testnet and inspect the exact payload each demo app receives.",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0B0F0E",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();

  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        instrumentSans.variable,
        ibmPlexMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
