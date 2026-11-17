// Preço dinâmico no mapa do motorista: hexágonos de alta demanda, do amarelo
// (pouco) ao vermelho (muito), cada um com o valor extra da corrida ali.
// A grade é a mesma do backend (App\Support\GradeHexagonal): pontas para cima,
// coordenadas axiais, projeção Mercator.

export type ModoDinamica = "multiplicador" | "valor_fixo";

export interface RegiaoDinamica {
  id: number;
  // chave "q:r" da grade
  celula: string;
  latitude: number;
  longitude: number;
  multiplicador: number;
  valor_adicional: number;
  // 0 (pouco acima do normal) a 1 (teto da cidade)
  intensidade: number;
  // "1,5x" ou "+R$2,25", já no modo da cidade
  rotulo: string;
  manual: boolean;
}

export interface MapaDinamico {
  ativa: boolean;
  modo: ModoDinamica | null;
  // raio do hexágono em metros da projeção
  raio_metros: number;
  regioes: RegiaoDinamica[];
}

export interface Ponto {
  latitude: number;
  longitude: number;
}

const RAIO_TERRA = 6378137;

const projetar = ({ latitude, longitude }: Ponto): [number, number] => [
  RAIO_TERRA * ((longitude * Math.PI) / 180),
  RAIO_TERRA * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)),
];

const desprojetar = (x: number, y: number): Ponto => ({
  longitude: ((x / RAIO_TERRA) * 180) / Math.PI,
  latitude:
    ((2 * Math.atan(Math.exp(y / RAIO_TERRA)) - Math.PI / 2) * 180) / Math.PI,
});

/** Os 6 cantos do hexágono em volta do centro, para desenhar o polígono. */
export function verticesDoHexagono(centro: Ponto, raioMetros: number): Ponto[] {
  const [x, y] = projetar(centro);

  return Array.from({ length: 6 }, (_, i) => {
    const angulo = (Math.PI / 180) * (60 * i + 30);

    return desprojetar(
      x + raioMetros * Math.cos(angulo),
      y + raioMetros * Math.sin(angulo),
    );
  });
}

const PARADAS = [
  { em: 0, cor: [255, 214, 0] }, // amarelo
  { em: 0.5, cor: [255, 140, 0] }, // laranja
  { em: 1, cor: [214, 40, 40] }, // vermelho
] as const;

const entre = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/** Cor da região pela intensidade: amarelo, laranja e vermelho. */
export function corDaIntensidade(intensidade: number): {
  preenchimento: string;
  borda: string;
  rotulo: string;
} {
  const i = Math.min(Math.max(intensidade, 0), 1);
  const fim = i <= 0.5 ? 1 : 2;
  const [de, ate] = [PARADAS[fim - 1], PARADAS[fim]];
  const t = (i - de.em) / (ate.em - de.em);
  const [r, g, b] = [
    entre(de.cor[0], ate.cor[0], t),
    entre(de.cor[1], ate.cor[1], t),
    entre(de.cor[2], ate.cor[2], t),
  ];

  return {
    // quanto mais quente, mais cobre o mapa (como nos apps de referência)
    preenchimento: `rgba(${r},${g},${b},${(0.3 + 0.25 * i).toFixed(2)})`,
    borda: `rgba(${r},${g},${b},0.9)`,
    // o rótulo é sólido e mais escuro, para ler sobre o mapa
    rotulo: `rgb(${Math.round(r * 0.82)},${Math.round(g * 0.62)},${Math.round(b * 0.5)})`,
  };
}

// ---- demonstração (simulador): a mesma grade, sem o servidor

const arredondar = (q: number, r: number): [number, number] => {
  const x = q;
  const z = r;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);

  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;

  return [rx, rz];
};

export function celulaDe(
  ponto: Ponto,
  tamanhoMetros: number,
): [number, number] {
  const [x, y] = projetar(ponto);

  return arredondar(
    ((Math.sqrt(3) / 3) * x - y / 3) / tamanhoMetros,
    ((2 / 3) * y) / tamanhoMetros,
  );
}

export function centroDaCelula(
  q: number,
  r: number,
  tamanhoMetros: number,
): Ponto {
  return desprojetar(
    tamanhoMetros * Math.sqrt(3) * (q + r / 2),
    tamanhoMetros * 1.5 * r,
  );
}

const formatar = (valor: number, casas: number) =>
  valor.toFixed(casas).replace(".", ",");

/**
 * Mapa quente de mentira em volta de um ponto: o hexágono do centro no teto e
 * os vizinhos esfriando, para ver as cores e os rótulos sem o servidor.
 */
export function mapaDeDemonstracao(
  centro: Ponto,
  modo: ModoDinamica,
  raioMetros = 600,
): MapaDinamico {
  const [q0, r0] = celulaDe(centro, raioMetros);
  const regioes: RegiaoDinamica[] = [];

  for (let dq = -2; dq <= 2; dq += 1) {
    for (let dr = -2; dr <= 2; dr += 1) {
      const distancia = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
      if (distancia > 2) continue;
      // no anel de fora, pula alguns para a mancha parecer orgânica
      if (distancia === 2 && (dq * 3 + dr * 5) % 3 === 0) continue;

      const intensidade = distancia === 0 ? 1 : distancia === 1 ? 0.62 : 0.22;
      const variacao = ((dq * 7 + dr * 11) % 5) * 0.03;
      const i = Math.min(Math.max(intensidade - variacao, 0.05), 1);
      const multiplicador = Math.round((1.1 + i * 1.4) * 10) / 10;
      const valor = Math.max(Math.round(i * 9 * 4) / 4, 0.5);
      const posicao = centroDaCelula(q0 + dq, r0 + dr, raioMetros);

      regioes.push({
        id: -(regioes.length + 1),
        celula: `${q0 + dq}:${r0 + dr}`,
        ...posicao,
        multiplicador,
        valor_adicional: valor,
        intensidade: Math.round(i * 100) / 100,
        rotulo:
          modo === "multiplicador"
            ? `${formatar(multiplicador, 1)}x`
            : `+R$${formatar(valor, 2)}`,
        manual: false,
      });
    }
  }

  return { ativa: true, modo, raio_metros: raioMetros, regioes };
}
