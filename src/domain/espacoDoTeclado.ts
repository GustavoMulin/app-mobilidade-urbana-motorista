// O Android (Expo SDK 57) desenha o app de ponta a ponta: a área útil vai até
// o fim da tela, atrás da barra de navegação, e o teclado nunca encolhe a
// janela. O topo do teclado vem em coordenada de tela, então precisa ser
// comparado com a altura da TELA. Comparar com a da janela (que no Android
// desconta as barras de status e navegação) subestimava ~64 dp e deixava
// botões como "Avançar" e "Reenviar código" atrás do teclado.
export function espacoCobertoPeloTeclado(
  alturaTela: number,
  topoDoTeclado: number,
): number {
  return Math.max(alturaTela - topoDoTeclado, 0);
}
