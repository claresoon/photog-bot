/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@photog-bot/shared"],
  webpack: (config) => {
    // @photog-bot/shared is authored for Node's NodeNext resolution, so its
    // relative imports use explicit ".js" extensions even though the source
    // files are ".ts". Teach webpack to resolve those back to source.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

module.exports = nextConfig;
