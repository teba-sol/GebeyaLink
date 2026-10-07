import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gebeyalink/types', '@gebeyalink/validation', '@gebeyalink/ui'],
};

export default nextConfig;
