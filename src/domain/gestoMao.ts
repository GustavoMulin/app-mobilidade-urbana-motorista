// Aceitar ou recusar a chamada pelo gesto da mão: fechar a mão aberta (como
// quem pega) aceita, abrir a mão fechada (como quem solta) recusa. Dois modelos
// do MediaPipe (Google, Apache 2.0) olham cada quadro da câmera frontal: o
// detector de palma (assets/modelos/detector_palma) acha a mão, e o de pontos
// (assets/modelos/pontos_mao) marca os 21 pontos dela, de onde sai se os dedos
// estão esticados ou dobrados.

// entrada do detector de palma: imagem quadrada de 192 x 192
export const LADO_MODELO = 192;
// o quadro também é reduzido a esse quadrado, de onde a mão é recortada
export const LADO_IMAGEM = 384;
// entrada do modelo de pontos: o recorte da mão, 224 x 224
export const LADO_PONTOS = 224;
// as 2016 âncoras: primeiro a grade fina (24 x 24 células, 2 por célula),
// depois a grossa (12 x 12 células, 6 por célula), na ordem das saídas
const ANCORAS_GRADE_FINA = 24 * 24 * 2;

/** centro (de 0 a 1) da âncora `indice` do detector */
export function centroDaAncora(indice: number): { x: number; y: number } {
  "worklet";
  const fina = indice < ANCORAS_GRADE_FINA;
  const grade = fina ? 24 : 12;
  const celula = fina
    ? Math.floor(indice / 2)
    : Math.floor((indice - ANCORAS_GRADE_FINA) / 6);
  return {
    x: ((celula % grade) + 0.5) / grade,
    y: (Math.floor(celula / grade) + 0.5) / grade,
  };
}

const sigmoide = (bruto: number) => {
  "worklet";
  return 1 / (1 + Math.exp(-Math.max(-100, Math.min(100, bruto))));
};

/** a palma achada pelo detector, em frações (0 a 1) da imagem do modelo */
export interface Palma {
  pontuacao: number; // confiança, de 0 a 1
  x: number; // centro da caixa
  y: number;
  largura: number;
  altura: number;
  punhoX: number; // ponto 0 do detector: o punho
  punhoY: number;
  dedoX: number; // ponto 2: a base do dedo médio
  dedoY: number;
}

/**
 * A palma mais provável do quadro. `caixas` traz 18 valores por âncora (centro
 * x e y, largura e altura, depois 7 pontos x e y, em pixels do modelo, relativos
 * à âncora) e `pontuacoes`, um valor bruto por âncora. Como no MediaPipe, o
 * resultado é a média das âncoras que também viram essa palma, pesada pela
 * confiança: uma âncora só tremula de um quadro para outro.
 */
export function melhorPalma(
  caixas: Float32Array,
  pontuacoes: Float32Array,
): Palma {
  "worklet";
  let melhor = 0;
  for (let indice = 1; indice < pontuacoes.length; indice++) {
    if (pontuacoes[indice] > pontuacoes[melhor]) melhor = indice;
  }
  const valoresPorAncora = caixas.length / pontuacoes.length;
  // centro, tamanho, punho e base do dedo médio da âncora, em frações
  const ler = (indice: number) => {
    const ancora = centroDaAncora(indice);
    const base = indice * valoresPorAncora;
    const valor = (k: number) => caixas[base + k] / LADO_MODELO;
    return [
      valor(0) + ancora.x,
      valor(1) + ancora.y,
      valor(2),
      valor(3),
      valor(4) + ancora.x,
      valor(5) + ancora.y,
      valor(8) + ancora.x,
      valor(9) + ancora.y,
    ];
  };
  const principal = ler(melhor);
  const pontuacao = sigmoide(pontuacoes[melhor]);
  const soma = [0, 0, 0, 0, 0, 0, 0, 0];
  let somaPeso = 0;
  for (let indice = 0; indice < pontuacoes.length; indice++) {
    const peso = sigmoide(pontuacoes[indice]);
    if (peso < pontuacao / 2) continue;
    const vizinha = ler(indice);
    if (
      Math.abs(vizinha[0] - principal[0]) > principal[2] / 2 ||
      Math.abs(vizinha[1] - principal[1]) > principal[3] / 2
    ) {
      continue;
    }
    somaPeso += peso;
    for (let k = 0; k < soma.length; k++) soma[k] += vizinha[k] * peso;
  }
  const media =
    somaPeso > 0 ? soma.map((valor) => valor / somaPeso) : principal;
  return {
    pontuacao,
    x: media[0],
    y: media[1],
    largura: media[2],
    altura: media[3],
    punhoX: media[4],
    punhoY: media[5],
    dedoX: media[6],
    dedoY: media[7],
  };
}

/** quadrado da mão inteira na imagem (frações), com o sentido dos dedos */
export interface RegiaoMao {
  x: number; // centro
  y: number;
  lado: number;
  cimaX: number; // direção do punho para os dedos (vetor unitário)
  cimaY: number;
}

/**
 * Onde recortar a mão para o modelo de pontos, como no MediaPipe: um quadrado
 * 2,6 vezes o tamanho da palma, meia palma deslocado na direção dos dedos e
 * girado para os dedos ficarem para cima.
 */
export function regiaoDaMao(palma: Palma): RegiaoMao {
  "worklet";
  const dx = palma.dedoX - palma.punhoX;
  const dy = palma.dedoY - palma.punhoY;
  const comprimento = Math.sqrt(dx * dx + dy * dy);
  const cimaX = comprimento > 0 ? dx / comprimento : 0;
  const cimaY = comprimento > 0 ? dy / comprimento : -1;
  return {
    x: palma.x + 0.5 * palma.altura * cimaX,
    y: palma.y + 0.5 * palma.altura * cimaY,
    lado: 2.6 * Math.max(palma.largura, palma.altura),
    cimaX,
    cimaY,
  };
}

/**
 * Copia a região da `imagem` (RGB de 0 a 255, `lado` x `lado` pixels) para a
 * entrada do modelo de pontos (`saida`: 224 x 224 x 3, de 0 a 1), com os dedos
 * para cima. O que cai fora da imagem fica preto.
 */
export function recortarMao(
  imagem: Uint8Array,
  lado: number,
  regiao: RegiaoMao,
  saida: Float32Array,
) {
  "worklet";
  const bytesPorLinha = imagem.length / lado;
  // pixels da imagem por pixel do recorte, ao longo dos eixos dele
  const escala = (regiao.lado * lado) / LADO_PONTOS;
  const direitaX = -regiao.cimaY * escala;
  const direitaY = regiao.cimaX * escala;
  const baixoX = -regiao.cimaX * escala;
  const baixoY = -regiao.cimaY * escala;
  // centro do primeiro pixel do recorte (canto de cima, à esquerda)
  const meio = LADO_PONTOS / 2 - 0.5;
  const origemX = regiao.x * lado - meio * (direitaX + baixoX);
  const origemY = regiao.y * lado - meio * (direitaY + baixoY);
  let i = 0;
  for (let linha = 0; linha < LADO_PONTOS; linha++) {
    let px = origemX + linha * baixoX;
    let py = origemY + linha * baixoY;
    for (let coluna = 0; coluna < LADO_PONTOS; coluna++) {
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      if (cx >= 0 && cy >= 0 && cx < lado && cy < lado) {
        const p = cy * bytesPorLinha + cx * 3;
        saida[i] = imagem[p] / 255;
        saida[i + 1] = imagem[p + 1] / 255;
        saida[i + 2] = imagem[p + 2] / 255;
      } else {
        saida[i] = 0;
        saida[i + 1] = 0;
        saida[i + 2] = 0;
      }
      i += 3;
      px += direitaX;
      py += direitaY;
    }
  }
}

/**
 * Para cada dedo menos o polegar (indicador, médio, anelar, mínimo): a
 * distância do punho até a ponta dividida pela distância do punho até a base do
 * dedo. Vem dos 21 pontos 3D da mão (`pontos`: x, y, z de cada um), então não
 * depende do tamanho nem do ângulo da mão na imagem. Esticado dá perto de 2;
 * dobrado na palma, perto de 1 ou menos.
 */
export function razoesDosDedos(pontos: Float32Array): number[] {
  "worklet";
  const doPunho = (indice: number) =>
    Math.sqrt(
      (pontos[indice * 3] - pontos[0]) ** 2 +
        (pontos[indice * 3 + 1] - pontos[1]) ** 2 +
        (pontos[indice * 3 + 2] - pontos[2]) ** 2,
    );
  // base e ponta de cada dedo, na numeração do MediaPipe
  return [
    doPunho(8) / doPunho(5),
    doPunho(12) / doPunho(9),
    doPunho(16) / doPunho(13),
    doPunho(20) / doPunho(17),
  ];
}

export type Pose = "aberta" | "fechada";
// No aparelho, a mão aberta deu de 1,27 a 2,1 (com ela relaxada o indicador
// fica mais baixo que os outros: 1,3 contra 1,5 a 1,8) e a fechada, de 0,54 a
// 0,98. No meio do movimento, de 1,1 a 1,35: não é nenhuma das duas
const ABERTA_DEDO = 1.2; // todos os dedos acima disso...
const ABERTA_MEDIA = 1.4; // ...e a média deles acima disso
const FECHADA_DEDO = 1.1; // todos abaixo disso

/** os quatro dedos esticados: aberta; os quatro dobrados: fechada */
export function poseDaMao(razoes: number[]): Pose | null {
  "worklet";
  const media = razoes.reduce((soma, razao) => soma + razao, 0) / razoes.length;
  if (razoes.every((razao) => razao > ABERTA_DEDO) && media > ABERTA_MEDIA) {
    return "aberta";
  }
  if (razoes.every((razao) => razao < FECHADA_DEDO)) return "fechada";
  return null;
}

export type Decisao = "aceitar" | "recusar";

export interface EstadoGesto {
  inicio: Pose | null; // a pose firme de onde o gesto parte
  inicioVistoEm: number; // último quadro com ela (ms)
  ultima: Pose | null; // a última pose vista (quadros sem pose não contam)
  seguidos: number; // quadros seguidos com ela
  vistaEm: number; // quando ela foi vista pela última vez
}

// a pose de partida precisa aparecer em tantos quadros seguidos: a mão
// mostrada, não só de passagem
const QUADROS_INICIO = 3;
// a de chegada decide já no primeiro quadro: a mão fechada (abaixo de 1,1) e a
// aberta são bem separadas, e o meio do movimento não é nenhuma das duas
const QUADROS_FIM = 1;
// da última vez que a mão foi vista na pose de partida até confirmar a de
// chegada: o gesto é rápido, como quem pega ou solta alguma coisa
const TRANSICAO_MS = 800;
// sem pose por mais que isso, a contagem de quadros seguidos recomeça
const PERDA_MS = 400;

export const estadoInicialGesto = (): EstadoGesto => ({
  inicio: null,
  inicioVistoEm: 0,
  ultima: null,
  seguidos: 0,
  vistaEm: 0,
});

/**
 * Avança com a pose vista no quadro do instante `t` (null: nenhuma). Fechar a
 * mão aberta (pegar) aceita; abrir a mão fechada (soltar) recusa.
 */
export function avancarGesto(
  anterior: EstadoGesto,
  t: number,
  pose: Pose | null,
): { estado: EstadoGesto; decisao: Decisao | null } {
  const estado =
    anterior.inicio !== null && t - anterior.inicioVistoEm > TRANSICAO_MS
      ? estadoInicialGesto()
      : anterior;
  if (pose === null) return { estado, decisao: null };
  const seguidos =
    pose === estado.ultima && t - estado.vistaEm <= PERDA_MS
      ? estado.seguidos + 1
      : 1;
  if (
    estado.inicio !== null &&
    pose !== estado.inicio &&
    seguidos >= QUADROS_FIM
  ) {
    return {
      estado: estadoInicialGesto(),
      decisao: estado.inicio === "aberta" ? "aceitar" : "recusar",
    };
  }
  const firme = seguidos >= QUADROS_INICIO;
  return {
    estado: {
      inicio: firme ? pose : estado.inicio,
      inicioVistoEm: firme || pose === estado.inicio ? t : estado.inicioVistoEm,
      ultima: pose,
      seguidos,
      vistaEm: t,
    },
    decisao: null,
  };
}
