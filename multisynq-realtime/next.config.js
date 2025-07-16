/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ESLint'i build sırasında kapat
  },
  typescript: {
    ignoreBuildErrors: true, // TypeScript hatalarını da kapat
  },
  // Multisynq için class isimlerini koru
  swcMinify: false, // SWC minify kapat
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Client-side minification'ı kapat
      config.optimization.minimize = false;
      config.optimization.minimizer = [];
    }
    return config;
  },
}

module.exports = nextConfig 