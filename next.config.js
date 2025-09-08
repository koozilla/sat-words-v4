/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['vercel.com', '*.vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
