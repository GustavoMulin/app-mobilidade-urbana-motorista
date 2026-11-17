// CODEX: contagem pendente; valida coordenadas e limita padding à área realmente disponível. Remover após validação/commit.
export interface PontoMapa {
  latitude: number;
  longitude: number;
}

export const pontoMapaValido = (
  ponto: PontoMapa | null | undefined,
): ponto is PontoMapa =>
  !!ponto &&
  Number.isFinite(ponto.latitude) &&
  Number.isFinite(ponto.longitude) &&
  Math.abs(ponto.latitude) <= 90 &&
  Math.abs(ponto.longitude) <= 180 &&
  !(ponto.latitude === 0 && ponto.longitude === 0);

export function paddingMapa(
  largura: number,
  altura: number,
  topo: number,
  rodape: number,
  // false: trajeto comprido (com paradas) já ocupa muito do mapa, então a
  // folga lateral é pequena para o zoom não ficar aberto demais
  folgaAberta = true,
) {
  const limiteVertical = Math.max(0, altura - Math.min(160, altura * 0.4));
  const desejadoTopo = Math.max(0, topo);
  const desejadoRodape = Math.max(0, rodape);
  const total = desejadoTopo + desejadoRodape;
  const fator =
    total > limiteVertical && total > 0 ? limiteVertical / total : 1;
  // folga grande dos lados: o trajeto da chamada fica pequeno no mapa, com
  // zoom aberto (como no "Procurando motorista" do passageiro)
  const lateral = folgaAberta
    ? Math.max(0, Math.min(130, largura * 0.32))
    : Math.max(0, Math.min(40, largura * 0.1));
  return {
    top: desejadoTopo * fator,
    bottom: desejadoRodape * fator,
    left: lateral,
    right: lateral,
  };
}
