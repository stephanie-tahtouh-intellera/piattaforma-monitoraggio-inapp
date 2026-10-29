import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@node-rs/argon2", "exceljs", "unpdf", "nodemailer", "tesseract.js", "@napi-rs/canvas", "yauzl", "pdf-lib"],
  poweredByHeader: false,
  typedRoutes: false,
  // Evita il tracciamento dell'intero progetto per gli accessi a file con percorso calcolato
  // (seed scenari in bundle, dati tesseract, migrazioni SQL) — DEC-113.
  outputFileTracingIncludes: {
    "/**": ["seed/scenarios/**", "seed/inapp/**", "vendor/tessdata/**", "db/migrations/**", "db/sql/**"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
