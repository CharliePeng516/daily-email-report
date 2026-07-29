import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives inside the CLI's repo (which has its own package-lock.json),
  // so tell Next.js explicitly not to trace file dependencies above web/.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
