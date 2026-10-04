import type { NextConfig } from "next";
import "./src/env"; // falha o build se faltar variável

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
