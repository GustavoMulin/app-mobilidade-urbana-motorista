// O topo do teclado vem em coordenada de tela e o fim da área do app também
// precisa vir: comparar com a altura da tela ou da janela erra nos dois
// sentidos. No Android de ponta a ponta o teclado fica por cima do app e a
// comparação com a janela deixava botões atrás dele; no Android que encolhe a
// área do app, a comparação com a tela subia o rodapé duas vezes.
export function espacoCobertoPeloTeclado(
  fimDaArea: number,
  topoDoTeclado: number,
): number {
  return Math.max(fimDaArea - topoDoTeclado, 0);
}
