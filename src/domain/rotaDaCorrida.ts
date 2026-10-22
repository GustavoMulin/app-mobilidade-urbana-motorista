export interface Coordenada {
  latitude: number;
  longitude: number;
}

interface DestinoDaCorrida {
  tipo: string;
  ordem?: number | string | null;
  endereco?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  concluida_em?: string | null;
}

interface CorridaComDestinos {
  status_corrida: string;
  corrida_destinos?: DestinoDaCorrida[];
}

export interface ProximoPonto {
  tipo: "origem" | "parada" | "destino";
  endereco: string | null;
  coordenada: Coordenada | null;
  // paradas da corrida: total e quantas faltam confirmar (inclui a atual)
  totalParadas: number;
  paradasPendentes: number;
}

const numero = (valor: number | string | null | undefined) => {
  const convertido = typeof valor === "string" ? Number(valor) : valor;

  return typeof convertido === "number" && Number.isFinite(convertido)
    ? convertido
    : null;
};

const coordenadaDe = (ponto: DestinoDaCorrida | undefined) => {
  const latitude = numero(ponto?.latitude);
  const longitude = numero(ponto?.longitude);

  return latitude === null || longitude === null
    ? null
    : { latitude, longitude };
};

// antes do embarque o alvo é a origem; em viagem é a próxima parada ainda não
// confirmada (na ordem da rota) e, sem paradas pendentes, o destino
export function proximoPontoDaCorrida(
  corrida: CorridaComDestinos | null,
): ProximoPonto | null {
  if (corrida === null) return null;

  const pontos = corrida.corrida_destinos ?? [];
  const paradas = pontos
    .filter((ponto) => ponto.tipo === "parada")
    .sort((a, b) => (numero(a.ordem) ?? 0) - (numero(b.ordem) ?? 0));
  const pendentes = paradas.filter((parada) => !parada.concluida_em);
  const base = {
    totalParadas: paradas.length,
    paradasPendentes: pendentes.length,
  };

  if (
    corrida.status_corrida === "aceita" ||
    corrida.status_corrida === "motorista_chegou"
  ) {
    const origem = pontos.find((ponto) => ponto.tipo === "origem");
    return {
      ...base,
      tipo: "origem",
      endereco: origem?.endereco ?? null,
      coordenada: coordenadaDe(origem),
    };
  }

  if (corrida.status_corrida !== "em_andamento") return null;

  const proximaParada = pendentes[0];
  if (proximaParada) {
    return {
      ...base,
      tipo: "parada",
      endereco: proximaParada.endereco ?? null,
      coordenada: coordenadaDe(proximaParada),
    };
  }

  const destino = pontos.find((ponto) => ponto.tipo === "destino");
  return {
    ...base,
    tipo: "destino",
    endereco: destino?.endereco ?? null,
    coordenada: coordenadaDe(destino),
  };
}

export function alvoDaCorrida(
  corrida: CorridaComDestinos | null,
): Coordenada | null {
  return proximoPontoDaCorrida(corrida)?.coordenada ?? null;
}
