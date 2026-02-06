import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack (default in Next.js 16)
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Handle Nillion dependencies that are not compatible with webpack
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "libsodium-wrappers-sumo": "commonjs libsodium-wrappers-sumo",
        "@nillion/blindfold": "commonjs @nillion/blindfold",
      });
    }

    // Fallback for modules that might not be available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Ignore React Native dependencies in MetaMask SDK and optional wagmi connectors
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      '@gemini-wallet/core': false,
      'porto': false,
      'porto/internal': false,
      '@safe-global/safe-apps-sdk': false,
      '@safe-global/safe-apps-provider': false,
    };

    return config;
  },

  // Transpile Nillion packages
  transpilePackages: [
    "@nillion/nilai-ts",
    "@nillion/nuc",
    "@nillion/secretvaults",
  ],
};

export default nextConfig;
