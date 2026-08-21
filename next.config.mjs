/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Em desenvolvimento, o Next 16 só entrega os arquivos do dev server para o
   * próprio domínio. O Replit (e o Codespaces) servem o preview por um domínio
   * de proxy, então precisam ser autorizados aqui — caso contrário o app abre
   * "morto", sem JavaScript.
   * Não tem efeito em produção.
   */
  allowedDevOrigins: [
    "*.replit.dev",
    "*.picard.replit.dev",
    "*.repl.co",
    "*.spock.replit.dev",
    "*.app.github.dev",
    "localhost",
  ],
};

export default nextConfig;
