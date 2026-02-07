/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Removido para permitir rotas de API (IA, Pagamentos)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configurações para melhorar compatibilidade mobile (Android)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
  // Otimizações de produção
  reactStrictMode: true,
  poweredByHeader: false,
}

export default nextConfig
