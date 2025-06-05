const path = require("path");
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // This tells Next.js to compile TypeScript in the @plated/db workspace
    transpilePackages: ['@plated/db'],
  };
  
  module.exports = nextConfig;
  