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
  // 0 (pouca) a 1 (muita) procura por corrida na região; sem o dado, vale a
  // própria intensidade do preço
  demanda?: number;
}

export interface MapaDinamico {
  ativa: boolean;
  modo: ModoDinamica | null;
  // raio do hexágono em metros da projeção
  raio_metros: number;
  regioes: RegiaoDinamica[];
  // procura por corrida, sem depender de ter tarifa; sem isso a camada usa as
  // próprias regiões com tarifa
  demandas?: DemandaDaRegiao[];
}

export interface DemandaDaRegiao {
  celula: string;
  latitude: number;
  longitude: number;
  // 0 (pouca) a 1 (muita)
  demanda: number;
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

export interface CamadasDoMapa {
  // manchas de demanda, com bonequinhos
  demanda: boolean;
  // hexágonos com o valor extra
  tarifas: boolean;
}

export const CAMADAS_PADRAO: CamadasDoMapa = { demanda: true, tarifas: true };

/** Demanda da região de 0 a 1. */
export const demandaDaRegiao = (regiao: RegiaoDinamica): number =>
  Math.min(Math.max(regiao.demanda ?? regiao.intensidade, 0), 1);

/**
 * Nível da demanda para o ícone: 1 leve ou moderada (uma pessoa), 2 alta
 * (duas pessoas) e 3 extrema (grupo).
 */
export const nivelDaDemanda = (demanda: number): 1 | 2 | 3 =>
  demanda >= 0.8 ? 3 : demanda >= 0.55 ? 2 : 1;

export interface IconeDeDemanda {
  celula: string;
  latitude: number;
  longitude: number;
  nivel: 1 | 2 | 3;
}

// vizinhos de uma célula na grade axial hexagonal
const VIZINHOS_AXIAIS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

// até este tamanho a área ganha um ícone só; acima disso, dois
const CELULAS_PARA_DOIS_ICONES = 5;

const distancia2 = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => (a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2;

/**
 * Menos ícones em cenário de muita demanda: células vizinhas do mesmo nível
 * (leve, alta ou extrema) formam uma área, e a área é representada por um
 * ícone, ou por dois quando é grande, em vez de um por célula.
 */
export function iconesDaDemanda(areas: DemandaDaRegiao[]): IconeDeDemanda[] {
  const porCelula = new Map(areas.map((area) => [area.celula, area]));
  const visitadas = new Set<string>();
  const icones: IconeDeDemanda[] = [];

  for (const inicio of areas) {
    if (visitadas.has(inicio.celula)) continue;

    const nivel = nivelDaDemanda(inicio.demanda);
    const grupo: DemandaDaRegiao[] = [];
    const fila = [inicio];
    visitadas.add(inicio.celula);

    // área = células vizinhas encadeadas do mesmo nível
    while (fila.length > 0) {
      const atual = fila.pop() as DemandaDaRegiao;
      const [q, r] = atual.celula.split(":").map(Number);
      grupo.push(atual);

      for (const [dq, dr] of VIZINHOS_AXIAIS) {
        const chave = `${q + dq}:${r + dr}`;
        const vizinha = porCelula.get(chave);

        if (
          vizinha &&
          !visitadas.has(chave) &&
          nivelDaDemanda(vizinha.demanda) === nivel
        ) {
          visitadas.add(chave);
          fila.push(vizinha);
        }
      }
    }

    const centro = {
      latitude: grupo.reduce((soma, g) => soma + g.latitude, 0) / grupo.length,
      longitude:
        grupo.reduce((soma, g) => soma + g.longitude, 0) / grupo.length,
    };
    const maisPerto = (alvo: typeof centro) =>
      grupo.reduce((melhor, g) =>
        distancia2(g, alvo) < distancia2(melhor, alvo) ? g : melhor,
      );

    let escolhidas: DemandaDaRegiao[];

    if (grupo.length < CELULAS_PARA_DOIS_ICONES) {
      escolhidas = [maisPerto(centro)];
    } else {
      // dois ícones afastados entre si: a ponta mais longe do centro e a ponta
      // mais longe dela
      const a = grupo.reduce((melhor, g) =>
        distancia2(g, centro) > distancia2(melhor, centro) ? g : melhor,
      );
      const b = grupo.reduce((melhor, g) =>
        distancia2(g, a) > distancia2(melhor, a) ? g : melhor,
      );

      escolhidas = [a, b];
    }

    for (const g of escolhidas) {
      icones.push({
        celula: g.celula,
        latitude: g.latitude,
        longitude: g.longitude,
        nivel,
      });
    }
  }

  return icones;
}

/** Cor da mancha de demanda, sem borda: do amarelo-claro ao laranja forte. */
export function corDaDemanda(demanda: number): string {
  const d = Math.min(Math.max(demanda, 0), 1);
  const [r, g, b] = [255, entre(214, 120, d), 0];

  return `rgba(${r},${g},${b},${(0.2 + 0.45 * d).toFixed(2)})`;
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
 * Mapa quente de mentira em volta de um ponto, como nos apps de referência: a
 * demanda cobre uma área bem maior, com falhas, e só as células mais quentes
 * têm tarifa (nem todo lugar com procura tem preço dinâmico).
 */
export function mapaDeDemonstracao(
  centro: Ponto,
  modo: ModoDinamica,
  raioMetros = 600,
): MapaDinamico {
  const [q0, r0] = celulaDe(centro, raioMetros);
  const regioes: RegiaoDinamica[] = [];
  const demandas: DemandaDaRegiao[] = [];
  const ALCANCE = 4;

  // ruído fixo por célula: o desenho não muda a cada vez que o mapa é montado
  const ruido = (dq: number, dr: number) => {
    const x = Math.sin(dq * 12.9898 + dr * 78.233) * 43758.5453;

    return x - Math.floor(x);
  };

  for (let dq = -ALCANCE; dq <= ALCANCE; dq += 1) {
    for (let dr = -ALCANCE; dr <= ALCANCE; dr += 1) {
      const distancia = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
      if (distancia > ALCANCE) continue;

      const ehCentro = distancia === 0;
      const bruta = 1 - distancia * 0.2 + (ruido(dq, dr) - 0.5) * 0.6;
      // fraca demais: a célula fica de fora, deixando falhas na mancha
      if (!ehCentro && bruta < 0.18) continue;

      const demanda = ehCentro
        ? 1
        : Math.min(Math.round(bruta * 100) / 100, 0.95);
      const posicao = centroDaCelula(q0 + dq, r0 + dr, raioMetros);
      const celula = `${q0 + dq}:${r0 + dr}`;

      demandas.push({ celula, ...posicao, demanda });

      // nem toda procura tem tarifa: parte das células com demanda entra, de
      // qualquer força (a dinâmica começa em 1,1x)
      if (!ehCentro && (demanda < 0.2 || ruido(dq + 7, dr - 3) < 0.6)) continue;

      // 1,1x na demanda mais fraca até 2,5x no teto
      const multiplicador =
        Math.round((1.1 + Math.max(demanda - 0.3, 0) * 2) * 10) / 10;
      const valor = Math.max(Math.round(demanda * 9 * 4) / 4, 0.5);

      regioes.push({
        id: -(regioes.length + 1),
        celula,
        ...posicao,
        multiplicador,
        valor_adicional: valor,
        // cor da borda pelo multiplicador: de 1,1x (amarelo) a 2,5x (vermelho)
        intensidade: Math.round(((multiplicador - 1.1) / 1.4) * 100) / 100,
        rotulo:
          modo === "multiplicador"
            ? `${formatar(multiplicador, 1)}x`
            : `+R$${formatar(valor, 2)}`,
        manual: false,
        demanda,
      });
    }
  }

  return { ativa: true, modo, raio_metros: raioMetros, regioes, demandas };
}
