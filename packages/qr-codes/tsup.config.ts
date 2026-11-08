import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    server: 'src/server/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  target: 'es2022',
  splitting: true,
  external: ['react', 'react/jsx-runtime', '@resvg/resvg-js'],
  async onSuccess() {
    // esbuild drops module-level directives when bundling, and Next needs this
    // one so the hooks/components can be imported from server components.
    for (const file of ['dist/react.js', 'dist/react.cjs']) {
      const source = await readFile(file, 'utf8')
      await writeFile(file, `"use client";\n${source}`)
    }
    await copyFile('src/react/styles.css', 'dist/styles.css')
  }
})
