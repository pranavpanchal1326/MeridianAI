const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Copy ONNX models to public directory on startup in development
// Only copies models needed for What-If (3 models)
const WHATIF_MODELS = [
  'outcome_collab_duration.onnx',
  'outcome_collab_cost.onnx',
  'risk_scorer.onnx'
];

if (process.env.NODE_ENV === 'development') {
  try {
    const publicModelsDir = path.join(process.cwd(), 'public', 'models');
    if (!fs.existsSync(publicModelsDir)) {
      fs.mkdirSync(publicModelsDir, { recursive: true });
    }
    WHATIF_MODELS.forEach(model => {
      const src = path.join(process.cwd(), 'models', model);
      const dest = path.join(publicModelsDir, model);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
    console.log('[next.config] ONNX models copied to public/models/');
  } catch (err) {
    console.warn('[next.config] Could not copy models:', err.message);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack: handle ONNX files and externals
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "onnxruntime-node",
      ]
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };

    // onnxruntime-web uses WASM files for browser ML inference.
    // asyncWebAssembly must be enabled or the What-If Simulator breaks.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    return config
  },

  // Security headers on every route.
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
            ].join("; "),
          },
        ],
      },
      {
        // ONNX model files in /public/models/ need correct MIME type,
        // aggressive cache, and COOP/COEP for SharedArrayBuffer support.
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
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ],
      },
    ]
  },
}

module.exports = nextConfig
