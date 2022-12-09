import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl"


export default defineConfig({
  server: {
    port: 8888,
  },
  plugins: [
    glsl()
  ]
});
