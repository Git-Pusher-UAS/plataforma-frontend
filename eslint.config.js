import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'src/api/generated', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    rules: {
      // Reglas de seguridad acordadas en la arquitectura:
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'No se guardan datos en localStorage. Usa src/offline (cifrado).' },
        { name: 'sessionStorage', message: 'No se guardan datos en sessionStorage. Usa src/offline (cifrado).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: 'Prohibido: usa src/offline (cifrado).' },
        { object: 'window', property: 'sessionStorage', message: 'Prohibido: usa src/offline (cifrado).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Prohibido dangerouslySetInnerHTML: React escapa la salida por defecto.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'Prohibido eval.',
        },
      ],
    },
  },
])
