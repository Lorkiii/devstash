import type { NextConfig } from "next";
import {
  GLOBAL_SECURITY_HEADERS,
  PRIVATE_CACHE_CONTROL,
  PRIVATE_ROBOTS_HEADER,
  STRICT_TRANSPORT_SECURITY,
} from "./app/lib/security/headers";

const privateRoutes = [
  "login",
  "dashboard",
  "vault",
  "projects",
  "notes",
  "tasks",
  "generator",
  "settings",
];

const nextConfig: NextConfig = {
  // API URLs can contain OAuth codes or stable private record identifiers.
  logging: { incomingRequests: { ignore: [/\/api(?:\/|\?|$)/] } },
  async headers() {
    const productionHeaders = process.env.NODE_ENV === "production"
      ? [{ key: "Strict-Transport-Security", value: STRICT_TRANSPORT_SECURITY }]
      : [];
    return [
      {
        source: "/:path*",
        headers: [...GLOBAL_SECURITY_HEADERS, ...productionHeaders],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: PRIVATE_CACHE_CONTROL }],
      },
      ...privateRoutes.map((route) => ({
        source: `/${route}/:path*`,
        headers: [
          { key: "Cache-Control", value: PRIVATE_CACHE_CONTROL },
          { key: "X-Robots-Tag", value: PRIVATE_ROBOTS_HEADER },
        ],
      })),
    ];
  },
};

export default nextConfig;
