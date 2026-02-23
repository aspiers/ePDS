import { defineConfig } from 'vitest/config'
import * as path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'packages/demo/src') + '/',
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts'],
  },
})
