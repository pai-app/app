import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.wrangler', '*.config.*', 'src/lib/icons/generated', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Force callers to use the manifest-driven `<Icon name="..." />` so the
      // bundle stays in sync with `icons.config.ts`. Exemptions below for
      // shadcn primitives, the icon loader/registry, and the generator output.
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'lucide-react',
            importNames: ['default'],
            message: 'Use <Icon name="..."/> from @/ui/icon and add the icon to icons.config.ts. Direct lucide imports are only allowed in src/ui/* (shadcn primitives) and src/lib/icons/* (registry).',
          },
        ],
        patterns: [
          {
            group: ['lucide-react', 'lucide-react/*'],
            message: 'Use <Icon name="..."/> from @/ui/icon and add the icon to icons.config.ts. Direct lucide imports are only allowed in src/ui/* (shadcn primitives) and src/lib/icons/* (registry).',
          },
        ],
      }],
    },
  },
  {
    // shadcn primitives + the icon registry/loader/generated bundles ship
    // their own lucide imports — that's the canonical pattern there.
    files: [
      'src/ui/**/*.{ts,tsx}',
      'src/lib/icons/**/*.{ts,tsx}',
      'src/assets/icons/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/providers/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
