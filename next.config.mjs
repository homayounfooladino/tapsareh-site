// User site. Built as static files only: Spark serves the "out" folder from the
// existing Python server. No Node or Next server runs on Spark.

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true },
  // Demo build only (DEMO_BUILD=1): relative asset paths so the files work under any folder.
  ...(process.env.DEMO_BUILD === "1" ? { assetPrefix: "." } : {}),
  // The page talks to /api/* on the same origin (the Python server). No rewrites, no server code.
};

export default nextConfig;
