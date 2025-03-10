// @ts-check

import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslint.configs.recommended,
  tsEslint.configs.recommended,

  {
    rules: {
      semi: ['warn', 'never'],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
