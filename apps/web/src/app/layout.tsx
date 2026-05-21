import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /**
     * suppressHydrationWarning on <html>: Privy and wagmi both initialise
     * purely on the client (auth state, wallet connection). The server renders
     * with no wallet/auth state; the client re-hydrates with the real state.
     * This one-level suppression silences the expected mismatch without hiding
     * real bugs deeper in the tree.
     */
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* DNS prefetch + preconnect shaves one RTT before the font stylesheet */}
        <link rel="dns-prefetch" href="https://api.fontshare.com" />
        <link rel="preconnect"   href="https://api.fontshare.com" crossOrigin="anonymous" />
        {/*
          Single <link rel="stylesheet"> with display=swap in the URL.
          - display=swap is handled by the font CDN — text stays visible in the
            fallback font while the custom font downloads (no invisible-text flash).
          - We intentionally drop the media="print" + onLoad trick here because
            React/JSX requires onLoad to be a function, not a string, and the
            string form throws: "Expected onLoad listener to be a function".
            The display=swap parameter achieves the same FOUT-prevention goal.
        */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
