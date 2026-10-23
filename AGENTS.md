# Frontend Motorista — Diretrizes para Agentes

## Stack
- React Native, Expo 57 (execução via **Expo Go** com `--go`)
- Navegação: `expo-router`
- Estilização: `nativewind` / `tailwindcss`
- Mapa e Radar: `react-native-maps`, componentes de despacho e aceite de corridas

## Execução e Conectividade
- IP LAN de desenvolvimento: `10.199.53.233`
- Backend API: `http://10.199.53.233/api` (ou porta 8000 se artisan serve).
- Reverb WebSocket: `10.199.53.233:8080`
- Inicialização para evitar colisão com o app do passageiro:
  ```bash
  REACT_NATIVE_PACKAGER_HOSTNAME=10.199.53.233 npx expo start --go --port 8082
  ```

## Validação
- Linter: `npm run lint`
- Formatação: `npm run format:check`
