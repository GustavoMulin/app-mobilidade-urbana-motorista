import type { Coordenada } from "./rotaDaCorrida";

export interface PassoNavegacao {
  manobra: string;
  instrucao: string;
  rua: string | null;
  distancia_m: number;
  duracao_s: number;
  inicio: Coordenada;
  fim: Coordenada;
  polyline: Coordenada[];
}

export interface RotaNavegacao {
  distancia_m: number;
  duracao_s: number;
  polyline: Coordenada[];
  passos: PassoNavegacao[];
}

// distância aproximada o bastante pra escolher o próximo passo e decidir
// quando avançar pro seguinte — não precisa da precisão de haversine puro
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const raio = 6371000;
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * raio * Math.asin(Math.min(1, Math.sqrt(h)));
}

// avança o passo quando o motorista chega perto do fim do passo atual —
// simples e robusto o bastante sem precisar projetar na polyline inteira
const RAIO_CONCLUSAO_PASSO_M = 30;

export function indiceDoPassoAtual(
  passos: PassoNavegacao[],
  posicao: Coordenada | null,
  indiceAnterior: number,
): number {
  if (posicao === null || passos.length === 0) return 0;

  let indice = Math.min(indiceAnterior, passos.length - 1);

  while (
    indice < passos.length - 1 &&
    distanciaMetros(posicao, passos[indice].fim) <= RAIO_CONCLUSAO_PASSO_M
  ) {
    indice += 1;
  }

  return indice;
}

/**
 * Ângulo (graus) pra rotacionar um ícone de seta apontando pra cima até
 * representar a manobra do Google Directions.
 */
export function anguloDaManobra(manobra: string): number {
  const angulos: Record<string, number> = {
    "turn-slight-right": 30,
    "turn-right": 90,
    "turn-sharp-right": 120,
    "uturn-right": 180,
    "uturn-left": 180,
    "turn-sharp-left": -120,
    "turn-left": -90,
    "turn-slight-left": -30,
    merge: 20,
    "ramp-right": 45,
    "ramp-left": -45,
    "fork-right": 30,
    "fork-left": -30,
    "keep-right": 15,
    "keep-left": -15,
    "roundabout-right": 90,
    "roundabout-left": -90,
  };

  return angulos[manobra] ?? 0;
}

export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.max(0, Math.round(metros))} m`;

  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

export function formatarHorario(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
