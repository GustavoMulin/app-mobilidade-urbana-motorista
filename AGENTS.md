# Frontend Motorista — Diretrizes para Agentes

## Stack
- React Native 0.88, Expo 58 (execução via **Expo Go** com a flag `--go`)
- Navegação: `expo-router`
- Estilização: `nativewind` / `tailwindcss`
- Mapa e Radar: `react-native-maps`, `expo-location`, componentes de despacho e aceite de corridas
- Tempo Real: `laravel-echo` + `pusher-js` conectado ao Laravel Reverb

## Execução e Conectividade
- IP LAN de desenvolvimento: `10.199.53.233`
- Backend API: `http://10.199.53.233/api` (se Sail porta 80) ou `http://10.199.53.233:8000/api` (se artisan serve).
- Reverb WebSocket: `10.199.53.233:8080`
- Inicialização para dispositivo físico na rede:
  ```bash
  REACT_NATIVE_PACKAGER_HOSTNAME=10.199.53.233 npm run start:go
  ```
- Portas fixas: gestão `8081`, motorista `8082` (este app) e passageiro `8083`; `npm start`, `npm run start:go` e `npm run start:dev` já usam a 8082
- Testes rodam em Expo Go; builds EAS apenas para distribuição

## Validação
- Linter: `npm run lint`
- Formatação: `npm run format:check`
