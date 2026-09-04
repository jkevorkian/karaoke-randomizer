import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el proyecto en /<nombre-del-repo>/.
// El workflow pasa BASE_PATH con el nombre real del repo; esto es solo el
// valor por defecto para cuando corrés el build a mano.
const BASE = process.env.BASE_PATH || '/karaoke-randomizer/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: { outDir: 'dist', assetsDir: 'assets' }
})
