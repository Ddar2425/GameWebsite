import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
 allowedDevOrigins: ['127.0.0.1'],
 async headers() { return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Content-Security-Policy',value:"frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"}]}]; }
};
export default nextConfig;
