// CODEX: contagem pendente; valida coordenadas e limita padding à área realmente disponível. Remover após validação/commit.
export interface PontoMapa {
  latitude: number;
  longitude: number;
}

export const pontoMapaValido = (ponto: PontoMapa | null | undefined): ponto is PontoMapa =>
  !!ponto && Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude) &&
  Math.abs(ponto.latitude) <= 90 && Math.abs(ponto.longitude) <= 180 &&
  !(ponto.latitude === 0 && ponto.longitude === 0);

export function paddingMapa(
  largura: number,
  altura: number,
  topo: number,
  rodape: number,
) {
  const limiteVertical = Math.max(0, altura - Math.min(160, altura * 0.4));
  const desejadoTopo = Math.max(0, topo);
  const desejadoRodape = Math.max(0, rodape);
  const total = desejadoTopo + desejadoRodape;
  const fator = total > limiteVertical && total > 0 ? limiteVertical / total : 1;
  const lateral = Math.max(0, Math.min(32, largura * 0.08));
  return { top: desejadoTopo * fator, bottom: desejadoRodape * fator, left: lateral, right: lateral };
}
