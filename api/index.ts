/**
 * Point d'entree serverless Vercel.
 *
 * Vercel route `/api/*` vers cette fonction (voir vercel.json). L'application
 * Express est exportee telle quelle : Vercel l'invoque comme un handler
 * Node (req, res) standard.
 *
 * Le front statique est servi separement depuis `dist/`.
 */
import app from '../app.ts';

export default app;
