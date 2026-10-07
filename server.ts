/**
 * Serveur Node local.
 *
 * En developpement il monte le middleware Vite (HMR) ; en production
 * self-hosted il sert le bundle statique `dist/`. Le deploiement Vercel
 * n'utilise PAS ce fichier : il passe par api/index.ts.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import app, { ensureSupabaseReady } from './app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Verification Supabase avant d'accepter du trafic.
  await ensureSupabaseReady();

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const express = (await import('express')).default;
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
