import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El indicador de ruta de Next.js en dev usa bottom-left por defecto, justo donde
  // vive el botón "Cerrar sesión" del sidebar admin — le tapaba los clics.
  devIndicators: {
    position: "bottom-right",
  },
  // Genera .next/standalone (server.js mínimo + solo los node_modules que realmente
  // se usan) para que el Dockerfile no tenga que instalar node_modules completo en
  // la imagen final.
  output: "standalone",
};

export default nextConfig;
