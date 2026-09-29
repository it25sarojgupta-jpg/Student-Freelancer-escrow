/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Optional deps of wallet connectors we don't use; stub them so the build never breaks.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    config.resolve.fallback = { ...config.resolve.fallback, "pino-pretty": false, lokijs: false, encoding: false };
    return config;
  },
};
export default nextConfig;
