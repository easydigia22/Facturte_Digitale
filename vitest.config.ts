import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // `.tsx` inclus : un futur test de composant ne doit pas être
    // silencieusement ignoré par la collecte.
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
