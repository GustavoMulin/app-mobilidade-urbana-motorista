# Handoff: modo escuro do app do motorista

Estado em 2026-11-13. A base do modo escuro está pronta e uma parte das telas já usa. O restante do app ainda é claro.

## Como funciona

- `src/theme/tema.tsx` tem o `TemaProvider` e o hook `useTema()`.
- O provider fica em `src/app/_layout.tsx`, por fora do `AuthProvider`. A escolha (`claro` ou `escuro`) é salva no AsyncStorage, na chave `motorista:tema`. O padrão é claro.
- `useTema()` devolve:
  - `escuro` e `modo`;
  - `alternar()` e `definir(modo)`;
  - `cores`, a paleta do tema atual;
  - `mapa`, com `userInterfaceStyle` e `customMapStyle` prontos para o `MapView`.
- Paleta (`CoresDoTema`): `fundo`, `superficie`, `cartao`, `item`, `texto`, `textoApoio`, `textoDesativado`, `borda`, `icone`, `veu`, `neutro`. Os valores claros são os que o app já usava.
- O botão fica em Preferências (`src/components/Preferencias.tsx`), como o item "Modo escuro" com um `Switch`.

## Como adaptar uma tela

Os estilos do app são `StyleSheet.create` com cores fixas. O padrão usado até aqui é manter o estilo e sobrescrever só a cor por cima, em linha:

```tsx
const { cores } = useTema();
<View style={[styles.cartao, { backgroundColor: cores.cartao }]}>
  <Text style={[styles.titulo, { color: cores.texto }]}>...</Text>
  <Ionicons name="chevron-forward" size={22} color={cores.textoDesativado} />
</View>
```

Cores de marca e de estado não entram na paleta e ficam como estão: amarelo `#FFD600`, verde `#17A673`, vermelho de erro e o azul da rota.

## Mapa

- `Map.tsx` e `NavegacaoAtiva.tsx` usam `tema.mapa.userInterfaceStyle` e `tema.mapa.customMapStyle`.
- No Android (Google Maps) o escuro vem de `ESTILO_MAPA_ESCURO`, em `tema.tsx`. No iOS o mapa escurece pelo `userInterfaceStyle`.
- A troca vale na hora, sem reabrir o app.

## Já adaptado

- Preferências, com `PreferenciaCompartilhada` (cartão, lugares e divisor).
- Menu lateral (`SideMenu.tsx`).
- Barra inferior com o botão Conectar (`MenuInferiorMotorista.tsx`).
- Barra de status (`BarraDeStatus` em `_layout.tsx`).
- Mapa da home e mapa da navegação ativa.

## Falta adaptar (continuar daqui)

Em ordem sugerida, das que ficam sobre o mapa para as demais:

1. Chamada recebendo (`RecebendoChamada`), corrida em andamento (`CorridaEmAndamento`, `MaisCorridaAtiva`), `NavegacaoAtiva` (cartões e botões sobre o mapa), `SolicitacoesCorrida`, Negocia (`NegociaMotorista`, `PilhaPropostasNegocia`) e `ChatDaCorrida`.
2. Home e folhas inferiores (`src/app/home.tsx`).
3. `PreferenciasChat`, que também é aberta de Preferências e ficou clara.
4. Perfil e telas de `src/components/usuario/` (`PerfilUsuario`, `PerfilPublico`, `MeuPerfil`, `Notas...`, `Verificacoes...`).
5. Ganhos, histórico, taxas, central de ajuda e indicação.
6. Login, cadastro e liberação (`src/app/login.tsx` e outras). Usam a paleta `src/theme/colors.ts`, separada desta.

Pontos de atenção:
- Trocar também as cores de `Ionicons`, `ActivityIndicator` e `placeholderTextColor`, que não vêm do `StyleSheet`.
- Modais e folhas que escurecem o fundo devem usar `cores.veu`.
- Se aparecer muita repetição, vale uma pequena função `estilosDoTema(cores)` com `useMemo`, no lugar do sobrescrever em linha.

## Pendências

- Nada foi aberto no celular. A verificação foi `tsc` e lint limpos.
- O estilo escuro do mapa ainda não foi visto em aparelho Android: conferir contraste de ruas, nomes e marcadores (`MarcadorMinhaLocalizacao`, pinos da rota).
- Decidir se o app deve seguir o tema do sistema na primeira abertura (hoje abre sempre claro).
