/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode:  true,
  poweredByHeader:  false,
  compress:         true,
  transpilePackages: ["@blin/shared", "@blin/sdk"],

  // ── Image optimization ──────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,           // cache optimised images 1 hr on CDN
    remotePatterns: [
      { hostname: "tokens.pancakeswap.finance" },
      { hostname: "assets.coingecko.com"       },
      { hostname: "raw.githubusercontent.com"  },
    ],
  },

  // ── Compiler / tree-shaking ─────────────────────────────────────────────
  experimental: {
    // Tree-shake heavy packages at compile time — cuts initial JS bundle
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "recharts",
      // NOTE: @rainbow-me/rainbowkit intentionally excluded — barrel optimization
      // breaks getDefaultConfig / connectorsForWallets when the wagmi config file
      // is imported by server components (e.g. layout.tsx for cookieToInitialState).
      "viem",
      "wagmi",
    ],
  },

  // ── HTTP response headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Cache static assets aggressively
          {
            key:   "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          // Security hardening
          { key: "X-Content-Type-Options", value: "nosniff"        },
          { key: "X-Frame-Options",        value: "DENY"           },
          { key: "Referrer-Policy",        value: "same-origin"    },
        ],
      },
      {
        // Long-lived cache for Next.js static chunks
        source: "/_next/static/(.*)",
        headers: [
          {
            key:   "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
