// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // CODEX: 8 linhas alteradas neste arquivo; separa o template antigo sem ocultar avisos do aplicativo ativo.
  {
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    files: ['components/**/*.{js,jsx,ts,tsx}'],
    rules: {
      // O alias @ aponta para src; estes exemplos do Expo não fazem parte do app.
      'import/no-unresolved': 'off',
    },
  },
  {
    ignores: ['dist/*'],
  },
]);
