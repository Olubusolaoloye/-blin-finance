/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode:  true,
  poweredByHeader:  false,
  compress:         true,
  transpilePackages: ["@blin/shared", "@blin/sdk"],

  // ── Image optimization ──────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { hostname: "tokens.pancakeswap.finance" },
      { hostname: "assets.coingecko.com"       },
      { hostname: "raw.githubusercontent.com"  },
    ],
  },

  // ── Compiler / tree-shaking ─────────────────────────────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "recharts",
      "viem",
      "wagmi",
    ],
  },

  // ── Webpack ─────────────────────────────────────────────────────────────
  webpack(config, { dev, isServer }) {
    // Silence the react-native async-storage warning from MetaMask SDK
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };

    // Production client-side: split the heavy wallet stack into separate
    // cacheable chunks. Landing page never loads the privy/web3 chunks.
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // Privy auth SDK — largest single dependency
          privy: {
            name:     "chunk-privy",
            test:     /[\\/]node_modules[\\/]@privy-io[\\/]/,
            priority: 40,
            chunks:   "all",
          },
          // wagmi + viem + @wagmi — core wallet primitives
          web3: {
            name:     "chunk-web3",
            test:     /[\\/]node_modules[\\/](wagmi|viem|@wagmi)[\\/]/,
            priority: 35,
            chunks:   "all",
          },
          // MetaMask SDK (transitive of @wagmi/connectors)
          metamask: {
            name:     "chunk-metamask",
            test:     /[\\/]node_modules[\\/]@metamask[\\/]/,
            priority: 30,
            chunks:   "all",
          },
          // motion (framer-motion) — animation library, medium size
          motion: {
            name:     "chunk-motion",
            test:     /[\\/]node_modules[\\/]motion[\\/]/,
            priority: 20,
            chunks:   "all",
          },
          // Everything else shared across 2+ pages
          commons: {
            name:      "chunk-commons",
            chunks:    "all",
            minChunks: 2,
            priority:  10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // ── HTTP response headers ────────────────────────────────────────────────
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control",          value: "public, max-age=0, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff"     },
          { key: "X-Frame-Options",        value: "DENY"        },
          { key: "Referrer-Policy",        value: "same-origin" },
        ],
      },
      // In development, never cache static chunks so HMR always loads fresh code.
      // In production, chunks are content-hashed so immutable caching is safe.
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key:   "Cache-Control",
            value: isDev
              ? "public, max-age=0, must-revalidate"
              : "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
