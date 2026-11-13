import assert from "node:assert/strict";
import test from "node:test";

import {
  avancarGesto,
  centroDaAncora,
  estadoInicialGesto,
  melhorPalma,
  poseDaMao,
  razoesDosDedos,
  recortarMao,
  regiaoDaMao,
} from "../src/domain/gestoMao.ts";

const perto = (valor, esperado) =>
  assert.ok(Math.abs(valor - esperado) < 1e-6, `${valor} != ${esperado}`);

test("as âncoras seguem a grade fina e depois a grossa", () => {
  perto(centroDaAncora(0).x, 1 / 48);
  perto(centroDaAncora(1).x, 1 / 48); // 2 âncoras na mesma célula
  perto(centroDaAncora(2).x, 3 / 48);
  perto(centroDaAncora(1151).y, 47 / 48);
  perto(centroDaAncora(1152).x, 1 / 24); // primeira da grade grossa
  perto(centroDaAncora(2015).x, 23 / 24);
  perto(centroDaAncora(2015).y, 23 / 24);
});

test("a palma é a âncora de maior pontuação, com caixa, punho e dedo médio", () => {
  const pontuacoes = new Float32Array(2016).fill(-10);
  const caixas = new Float32Array(2016 * 18);
  const base = 1152 * 18;
  pontuacoes[1152] = 5;
  caixas[base] = 19.2; // centro: +0,1 da largura
  caixas[base + 1] = -9.6; // -0,05 da altura
  caixas[base + 2] = 38.4; // caixa de 0,2 x 0,2
  caixas[base + 3] = 38.4;
  caixas[base + 5] = 19.2; // punho: 0,1 abaixo da âncora
  caixas[base + 9] = -19.2; // base do dedo médio: 0,1 acima
  const palma = melhorPalma(caixas, pontuacoes);
  perto(palma.pontuacao, 1 / (1 + Math.exp(-5)));
  perto(palma.x, 1 / 24 + 0.1);
  perto(palma.y, 1 / 24 - 0.05);
  perto(palma.largura, 0.2);
  perto(palma.punhoY, 1 / 24 + 0.1);
  perto(palma.dedoY, 1 / 24 - 0.1);
});

test("as âncoras vizinhas que viram a mesma palma entram na média", () => {
  const pontuacoes = new Float32Array(2016).fill(-10);
  const caixas = new Float32Array(2016 * 18);
  // duas âncoras da mesma célula, igualmente confiantes: centros 0,1 e 0,2
  for (const [indice, deslocamento] of [
    [0, 0.1],
    [1, 0.2],
  ]) {
    pontuacoes[indice] = 4;
    caixas[indice * 18] = deslocamento * 192;
    caixas[indice * 18 + 2] = 96; // caixa larga: a outra está dentro
    caixas[indice * 18 + 3] = 96;
  }
  perto(melhorPalma(caixas, pontuacoes).x, 1 / 48 + 0.15);
});

const palmaEm = (punho, dedo) => ({
  pontuacao: 1,
  x: 0.5,
  y: 0.5,
  largura: 0.1,
  altura: 0.1,
  punhoX: punho[0],
  punhoY: punho[1],
  dedoX: dedo[0],
  dedoY: dedo[1],
});

test("a região da mão cresce 2,6 vezes e anda meia palma para os dedos", () => {
  // dedos para cima
  const emPe = regiaoDaMao(palmaEm([0.5, 0.6], [0.5, 0.4]));
  perto(emPe.lado, 0.26);
  perto(emPe.x, 0.5);
  perto(emPe.y, 0.45);
  // dedos para a direita
  const deitada = regiaoDaMao(palmaEm([0.4, 0.5], [0.6, 0.5]));
  perto(deitada.x, 0.55);
  perto(deitada.y, 0.5);
  perto(deitada.cimaX, 1);
});

// imagem 4 x 4 em que o vermelho de cada pixel é a coluna, o verde é a linha e
// o azul é sempre 255 (o preto de fora da imagem não tem azul)
const imagemTeste = () => {
  const imagem = new Uint8Array(4 * 4 * 3);
  for (let linha = 0; linha < 4; linha++) {
    for (let coluna = 0; coluna < 4; coluna++) {
      imagem.set([coluna * 50, linha * 50, 255], (linha * 4 + coluna) * 3);
    }
  }
  return imagem;
};
// pixel (coluna, linha) do recorte 224 x 224, de 0 a 255
const pixel = (saida, coluna, linha) => {
  const i = (linha * 224 + coluna) * 3;
  return [0, 1, 2].map((canal) => Math.round(saida[i + canal] * 255));
};

test("o recorte copia a região com os dedos para cima e preto fora da imagem", () => {
  const saida = new Float32Array(224 * 224 * 3);
  // a imagem toda, em pé: o canto de cima à esquerda é o pixel (0, 0)
  recortarMao(
    imagemTeste(),
    4,
    { x: 0.5, y: 0.5, lado: 1, cimaX: 0, cimaY: -1 },
    saida,
  );
  assert.deepEqual(pixel(saida, 0, 0), [0, 0, 255]);
  assert.deepEqual(pixel(saida, 223, 0), [150, 0, 255]);
  assert.deepEqual(pixel(saida, 0, 223), [0, 150, 255]);
  // dedos apontando para a direita da imagem: o lado direito vira o de cima
  recortarMao(
    imagemTeste(),
    4,
    { x: 0.5, y: 0.5, lado: 1, cimaX: 1, cimaY: 0 },
    saida,
  );
  assert.deepEqual(pixel(saida, 0, 0), [150, 0, 255]); // canto de cima à direita
  assert.deepEqual(pixel(saida, 0, 223), [0, 0, 255]);
  // região do dobro da imagem: as sobras ficam pretas
  recortarMao(
    imagemTeste(),
    4,
    { x: 0.5, y: 0.5, lado: 2, cimaX: 0, cimaY: -1 },
    saida,
  );
  assert.deepEqual(pixel(saida, 0, 0), [0, 0, 0]);
  assert.deepEqual(pixel(saida, 60, 60), [0, 0, 255]); // já dentro: pixel (0, 0)
  assert.deepEqual(pixel(saida, 112, 112), [100, 100, 255]);
  assert.deepEqual(pixel(saida, 223, 223), [0, 0, 0]);
});

// 21 pontos 3D com o punho na origem; cada dedo tem a base a 1 do punho e a
// ponta, na mesma direção, a `pontas[dedo]` do punho (indicador ao mínimo)
const maoCom = (pontas) => {
  const pontos = new Float32Array(63);
  [5, 9, 13, 17].forEach((base, dedo) => {
    const angulo = (dedo - 1.5) * 0.2;
    const [x, y] = [Math.sin(angulo), -Math.cos(angulo)];
    pontos[base * 3] = x;
    pontos[base * 3 + 1] = y;
    pontos[(base + 3) * 3] = x * pontas[dedo];
    pontos[(base + 3) * 3 + 1] = y * pontas[dedo];
  });
  return pontos;
};

test("os dedos esticados abrem a mão, dobrados fecham, e o meio-termo não conta", () => {
  const razoes = razoesDosDedos(maoCom([2, 1.9, 1.8, 1.7]));
  [2, 1.9, 1.8, 1.7].forEach((esperado, dedo) => perto(razoes[dedo], esperado));
  assert.equal(poseDaMao(razoes), "aberta");
  assert.equal(
    poseDaMao(razoesDosDedos(maoCom([0.8, 0.9, 1, 1.05]))),
    "fechada",
  );
  // aberta e relaxada, com o indicador mais baixo (medido no aparelho)
  assert.equal(poseDaMao([1.27, 1.42, 1.47, 1.69]), "aberta");
  // um dedo dobrado não é mão aberta, e o meio do movimento não é nenhuma
  assert.equal(poseDaMao([2, 2, 2, 1]), null);
  assert.equal(poseDaMao([1.16, 1.13, 1.2, 1.35]), null);
  assert.equal(poseDaMao([1.3, 1.3, 1.3, 1.3]), null);
});

// [t (ms), pose ou null] -> as decisões que saíram
const percorrer = (quadros) => {
  let estado = estadoInicialGesto();
  const decisoes = [];
  for (const [t, pose] of quadros) {
    const passo = avancarGesto(estado, t, pose);
    estado = passo.estado;
    if (passo.decisao) decisoes.push(passo.decisao);
  }
  return decisoes;
};
// a mesma pose em `quadros` quadros a partir de `inicio`, um a cada 100 ms
const vendo = (pose, inicio, quadros) =>
  Array.from({ length: quadros }, (_, i) => [inicio + i * 100, pose]);

test("pegar (fechar a mão aberta) aceita e soltar (abrir a fechada) recusa", () => {
  // a mão meio fechada no meio do movimento não tem pose
  assert.deepEqual(
    percorrer([
      ...vendo("aberta", 0, 3),
      [300, null],
      ...vendo("fechada", 400, 2),
    ]),
    ["aceitar"],
  );
  assert.deepEqual(
    percorrer([...vendo("fechada", 0, 3), ...vendo("aberta", 300, 2)]),
    ["recusar"],
  );
});

test("a mão parada, aberta ou fechada, não decide nada", () => {
  assert.deepEqual(percorrer(vendo("aberta", 0, 30)), []);
  assert.deepEqual(percorrer(vendo("fechada", 0, 30)), []);
});

test("a pose de chegada decide no primeiro quadro, mas a de partida precisa ser mostrada", () => {
  assert.deepEqual(percorrer([...vendo("aberta", 0, 3), [300, "fechada"]]), [
    "aceitar",
  ]);
  // aberta em só 2 quadros: não chegou a ser mostrada
  assert.deepEqual(
    percorrer([...vendo("aberta", 0, 2), ...vendo("fechada", 200, 2)]),
    [],
  );
});

test("fechar devagar demais não decide", () => {
  assert.deepEqual(
    percorrer([
      ...vendo("aberta", 0, 3),
      [600, null],
      ...vendo("fechada", 1100, 2),
    ]),
    [],
  );
});

test("quadros soltos, com a mão sumindo entre eles, não firmam a pose", () => {
  assert.deepEqual(
    percorrer([
      [0, "fechada"],
      [1000, "fechada"],
      [2000, "fechada"],
      ...vendo("aberta", 2100, 2),
    ]),
    [],
  );
});
