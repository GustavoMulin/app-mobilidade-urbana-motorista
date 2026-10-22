// Negocia: os três valores sugeridos ao motorista somam à oferta do
// passageiro (regra do superior, 16/10). O servidor aceita até o dobro da
// oferta (NegociacaoCorridaService::propor), então o que passar disso sai.
export const AUMENTOS_SUGERIDOS = [1, 2.5, 4] as const;

export const valoresSugeridos = (oferta: number) =>
  AUMENTOS_SUGERIDOS.map(
    (aumento) => Math.round((oferta + aumento) * 100) / 100,
  ).filter((valor) => valor <= oferta * 2 + 0.009);

// tempo até o ponto, pela velocidade média da cidade (25 km/h)
export const minutosEstimados = (distanciaKm: number) =>
  Math.max(1, Math.round((distanciaKm / 25) * 60));

// abaixo de 1 km o motorista lê em metros, como no 99
export const emDistancia = (distanciaKm?: number | null) => {
  if (typeof distanciaKm !== "number") return "—";
  return distanciaKm < 1
    ? `${Math.max(1, Math.round(distanciaKm * 1000))} m`
    : `${distanciaKm.toFixed(1).replace(".", ",")} km`;
};
