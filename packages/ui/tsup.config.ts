import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['react', 'react-dom'],
  splitting: false,
  treeshake: true,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    };
  },
});