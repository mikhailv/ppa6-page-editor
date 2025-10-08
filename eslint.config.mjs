// @ts-check

import eslint from '@eslint/js'
import tsEslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default tsEslint.config(
  eslint.configs.recommended,
  tsEslint.configs.recommended,

  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      'semi': 'off', // Disable the standard ESLint semi rule
      '@stylistic/semi': ['error', 'never'], // Use the TypeScript-specific semi rule
      'no-unreachable': 'error',
      'no-unexpected-multiline': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
