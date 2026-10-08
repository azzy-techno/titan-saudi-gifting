import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // R3F: three.js objects are mutated in useFrame by design
    files: ['src/three/**/*.{ts,tsx}', 'src/chapters/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'node_modules/**',
    'blender/**',
    'qa/**',
    '.cache/**',
    'public/**',
    'next-env.d.ts',
    'src/three/generated/**',
  ]),
])
