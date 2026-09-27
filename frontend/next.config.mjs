/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_API_URL 
          ? `${process.env.INTERNAL_API_URL}/:path*`
          : 'http://127.0.0.1:5001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
