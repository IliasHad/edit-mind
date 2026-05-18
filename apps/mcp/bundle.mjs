import * as esbuild from 'esbuild'

const esmExtensionPlugin = {
  name: 'esm-extension',
  setup(build) {
    build.onResolve({ filter: /^@/ }, async (args) => {
      if (args.path.endsWith('.js')) return
      const result = await build.resolve(args.path + '.js', {
        kind: args.kind,
        resolveDir: args.resolveDir,
        importer: args.importer,
      })
      if (!result.errors.length) return result
    })
  },
}

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/index.js',
  plugins: [esmExtensionPlugin],
})
