import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiServerConfig } from "@/lib/wagmi-server"; // server-safe — no Privy imports
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blin Finance — Save Every Swap",
    template: "%s | Blin Finance",
  },
  description: "Non-custodial DeFi super-app for Africa. Swap tokens, AutoSave every transaction, move NGN in and out of crypto instantly.",
  keywords: ["DeFi", "Africa", "NGN", "crypto", "swap", "savings", "Nigeria", "blockchain"],
  openGraph: {
    title: "Blin Finance — Save Every Swap",
    description: "Swap tokens, save automatically, move NGN in and out of crypto. No bank account needed.",
    siteName: "Blin Finance",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blin Finance",
    description: "DeFi super-app for Africa. AutoSave every swap.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0D2137",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read wagmi state from the request cookie on the server so WagmiProvider
  // hydrates with the exact same state the client already has — this prevents
  // the "Invalid property descriptor" Object.defineProperty crash that occurs
  // when wagmi's cookieStorage tries to redefine an already-initialised state.
  const initialState = cookieToInitialState(wagmiServerConfig, (await headers()).get("cookie"));
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* DNS prefetch + preconnect to font CDN — shaves RTT before stylesheet loads */}
        <link rel="dns-prefetch"  href="https://api.fontshare.com" />
        <link rel="preconnect"    href="https://api.fontshare.com" crossOrigin="anonymous" />
        {/*
          display=swap: text stays visible in fallback font while custom font loads
          (prevents invisible-text flash that makes the page look blank).
          rel=preload triggers the fetch early; the <link rel="stylesheet"> below
          is still needed to actually apply the CSS.
        */}
        <link
          rel="preload"
          as="style"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&display=swap"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
          media="print"
          // @ts-expect-error — onload is valid on <link> for non-blocking font load
          onLoad="this.media='all'"
        />
        {/* Fallback for JS-disabled browsers */}
        <noscript>
          <link
            href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </head>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
