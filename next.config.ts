import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth callback query strings can contain one-time authorization codes.
  logging: { incomingRequests: { ignore: [/\/api\/auth(?:\/|\?)/] } },
  async headers() {
    const privateRoutes = ["login", "dashboard", "vault", "projects", "notes", "tasks", "generator", "settings"];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      ...privateRoutes.map((route) => ({
        source: `/${route}/:path*`,
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      })),
    ];
  },
};

export default nextConfig;
