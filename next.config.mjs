/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "zipline.mv",
        "admin.zipline.mv",
        "agents.zipline.mv",
        "affiliate.zipline.mv",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
