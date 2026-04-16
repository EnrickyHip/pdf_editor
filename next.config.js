/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  transpilePackages: ['pdfjs-dist'],
  serverExternalPackages: ['@napi-rs/canvas', 'tesseract.js'],
};

module.exports = nextConfig;
