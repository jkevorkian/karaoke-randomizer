import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el proyecto en /<nombre-del-repo>/.
// Si renombrás el repo, cambiá BASE o pasá BASE_PATH al build.
const BASE = process.env.BASE_PATH || '/Braian-cumple-karaoke/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: { outDir: 'dist', assetsDir: 'assets' }
})
