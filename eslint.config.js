import js from '@eslint/js'
import typescript from 'typescript-eslint'

export default [
  {
    ignores: ['node_modules', '.next', 'out', 'dist', 'build', 'coverage', '*.mjs'],
  },
  js.configs.recommended,
  ...typescript.configs.recommended,
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
