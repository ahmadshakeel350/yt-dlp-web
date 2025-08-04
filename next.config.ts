/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yt-dlp']
  }
}

module.exports = nextConfig
