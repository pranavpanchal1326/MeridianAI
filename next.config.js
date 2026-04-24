/** @type {import('next').NextConfig} */
const nextConfig = {
  // ONNX runtime: onnxruntime-node is a native Node.js C++ addon.
  // It MUST be listed as external so webpack never tries to bundle it.
  // If webpack bundles it - build crashes. No exceptions.
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "onnxruntime-node",
      ]
    }

    // onnxruntime-web uses WASM files for browser ML inference.
    // asyncWebAssembly must be enabled or the What-If Simulator breaks.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    return config
  },

  // Security headers on every route.
  // microphone=() is not just a UI choice - it is enforced at HTTP level.
  // Voice intake is removed from this product permanently.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "microphone=(), camera=(), geolocation=()",
            // microphone DENIED at HTTP header level.
            // Not just hidden in the UI. Blocked by the browser itself.
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.web3.storage",
              "worker-src 'self' blob:",
              // blob: is required - onnxruntime-web spawns WASM workers as blobs
            ].join("; "),
          },
        ],
      },
      {
        // ONNX model files in /public/models/ need correct MIME type
        // and aggressive cache headers - these files never change between deploys
        source: "/models/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/octet-stream",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
