import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', 'pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
