/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*` }]
      : [];
  },
};
module.exports = nextConfig;
