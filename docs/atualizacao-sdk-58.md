# SDK 58

Os aplicativos usam Expo SDK 58, React 19.3 e React Native 0.88.

## Abrir no Expo Go

Na pasta deste aplicativo:

```sh
npm install
npm run start:go -- --clear
```

Use o Expo Go compatível com SDK 58 e escaneie o QR Code pelo iPhone.
O comando `start:go` usa a porta 8083. Mantenha a gestão na 8081, o passageiro na 8082 e o motorista na 8083. Use este comando para evitar conflito com a gestão.
A API e as chaves dos serviços continuam dependendo da configuração de ambiente do projeto.


Para usar `npx expo start -c`, configure `RCT_METRO_PORT=8083` no `.env.local` deste projeto. Esse arquivo local não vai pelo Git.

## Mudanças da migração

- Dependências alinhadas com o catálogo oficial do Expo, sem forçar conflitos de peer dependencies.
- Referências de texto, campos e rolagem adaptadas à API de tipos do React Native 0.88, mantendo TypeScript estrito.
- Rodapés de listas vazios usam `undefined`, conforme os tipos atuais.
- Removido o patch antigo de `react-native-maps` 1.27.2: o arquivo `MapView.java` da versão 1.29.11 foi comparado com o pacote oficial e já contém as mesmas correções.
- O passageiro mantém seu patch de `react-native-draggable-flatlist`, necessário para substituir `InteractionManager`.

As adaptações para navegador removidas anteriormente continuam fora destes aplicativos.

Guia oficial: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
