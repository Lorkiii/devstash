export const GLOBAL_SECURITY_HEADERS = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

export const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0";
export const PRIVATE_ROBOTS_HEADER = "noindex, nofollow, noarchive";

// HSTS is emitted only by production builds; local HTTP development must remain usable.
export const STRICT_TRANSPORT_SECURITY = "max-age=31536000; includeSubDomains";
