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

// Font URL — served by Fontshare CDN with display=swap (FOUT-safe).
// Preloaded as a resource hint so the browser starts fetching the stylesheet
// in parallel with HTML parsing rather than waiting for the <head> to be parsed.
const FONT_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@600,700&f[]=satoshi@400,500,700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* ── Font strategy ────────────────────────────────────────────────
            1. dns-prefetch  — resolves the hostname before the browser needs it
            2. preconnect    — establishes TLS handshake early
            3. preload       — fetches the stylesheet at highest priority,
                               before the parser reaches the <link rel="stylesheet">
            4. stylesheet    — the actual load; display=swap prevents FOIT
        */}
        <link rel="dns-prefetch"  href="https://api.fontshare.com" />
        <link rel="preconnect"    href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preload"       href={FONT_URL} as="style" />
        <link rel="stylesheet"    href={FONT_URL} />

        {/* Critical CSS — inline the bare minimum so the above-fold paint
            doesn't flash with system fonts while the stylesheet loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box}
          html{-webkit-text-size-adjust:100%;text-rendering:optimizeLegibility}
          body{margin:0;-webkit-font-smoothing:antialiased;moz-osx-font-smoothing:grayscale}
        ` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
