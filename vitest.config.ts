import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup/web-storage.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/lib/icons/**', // icon registry/loader — UI infra
        'src/**/*.d.ts',
        'src/**/*.tsx', // React components/pages/providers — UI, tested separately
        'src/**/use-*.ts', // React hooks — need a render harness (UI)
        'src/lib/magic-word.ts', // window keydown listener — UI
        'src/services/mail/**', // Gmail/Graph network IO — integration, not unit
        'src/services/import/file-import-context.ts', // file parse pipeline — integration
        'src/services/import/email-import-context.ts', // email/mail pipeline — integration
        'src/lib/fyredb-config.ts', // app bootstrap/config
        'src/log.ts', // logger setup
        'src/**/types.ts', // type-only
        'src/services/types.ts',
        'src/services/email-types.ts',
        'src/**/index.ts', // re-export barrels
        'src/pages/landing/features.ts', // static content
        'src/pages/settings/sections/general/options.ts', // static content
      ],
    },
  },
})
