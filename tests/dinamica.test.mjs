import assert from "node:assert/strict";
import test from "node:test";

import {
  celulaDe,
  centroDaCelula,
  corDaIntensidade,
  mapaDeDemonstracao,
  verticesDoHexagono,
} from "../src/domain/dinamica.ts";

const PORTO_VELHO = { latitude: -8.7619, longitude: -63.9039 };

test("o centro de uma célula cai na própria célula (mesma grade do backend)", () => {
  const [q, r] = celulaDe(PORTO_VELHO, 1200);
  const centro = centroDaCelula(q, r, 1200);

  assert.deepEqual(celulaDe(centro, 1200), [q, r]);
});

test("o hexágono tem 6 cantos, todos à mesma distância do centro", () => {
  const vertices = verticesDoHexagono(PORTO_VELHO, 1200);

  assert.equal(vertices.length, 6);

  const distancias = vertices.map((v) =>
    Math.hypot(
      (v.latitude - PORTO_VELHO.latitude) * 111_320,
      (v.longitude - PORTO_VELHO.longitude) *
        111_320 *
        Math.cos((PORTO_VELHO.latitude * Math.PI) / 180),
    ),
  );

  // ~1200 m de projeção, um pouco menos no chão; todos iguais entre si
  for (const d of distancias) {
    assert.ok(Math.abs(d - distancias[0]) < 15, `canto fora do raio: ${d}`);
    assert.ok(d > 1100 && d < 1250, `raio estranho: ${d}`);
  }
});

test("hexágonos vizinhos dividem uma aresta: o canto de um é o canto do outro", () => {
  const [q, r] = celulaDe(PORTO_VELHO, 1200);
  const a = verticesDoHexagono(centroDaCelula(q, r, 1200), 1200);
  const b = verticesDoHexagono(centroDaCelula(q + 1, r, 1200), 1200);

  const iguais = a.filter((va) =>
    b.some(
      (vb) =>
        Math.abs(va.latitude - vb.latitude) < 1e-6 &&
        Math.abs(va.longitude - vb.longitude) < 1e-6,
    ),
  );

  assert.equal(iguais.length, 2);
});

test("a cor vai do amarelo ao vermelho conforme a intensidade", () => {
  const fraca = corDaIntensidade(0);
  const media = corDaIntensidade(0.5);
  const forte = corDaIntensidade(1);

  assert.match(fraca.preenchimento, /^rgba\(255,214,0,/);
  assert.match(media.preenchimento, /^rgba\(255,140,0,/);
  assert.match(forte.preenchimento, /^rgba\(214,40,40,/);
  // fora da faixa é travado nos extremos
  assert.equal(corDaIntensidade(-3).preenchimento, fraca.preenchimento);
  assert.equal(corDaIntensidade(9).preenchimento, forte.preenchimento);
});

test("a demonstração tem o hexágono mais quente no centro e rótulos do modo", () => {
  const multiplicador = mapaDeDemonstracao(PORTO_VELHO, "multiplicador");
  const fixo = mapaDeDemonstracao(PORTO_VELHO, "valor_fixo");

  assert.ok(multiplicador.regioes.length >= 4);
  // a demanda cobre bem mais que as tarifas (nem toda procura tem preço extra)
  assert.ok(multiplicador.demandas.length > multiplicador.regioes.length * 2);
  assert.ok(
    multiplicador.regioes.every((x) =>
      multiplicador.demandas.some((d) => d.celula === x.celula),
    ),
  );
  assert.equal(multiplicador.ativa, true);

  const [q, r] = celulaDe(PORTO_VELHO, 600);
  const doCentro = multiplicador.regioes.find((x) => x.celula === `${q}:${r}`);
  assert.ok(doCentro);
  assert.equal(
    Math.max(...multiplicador.regioes.map((x) => x.intensidade)),
    doCentro.intensidade,
  );

  assert.ok(multiplicador.regioes.every((x) => /^\d,\dx$/.test(x.rotulo)));
  assert.ok(fixo.regioes.every((x) => /^\+R\$\d+,\d{2}$/.test(x.rotulo)));
  // sem repetir hexágono
  assert.equal(
    new Set(multiplicador.regioes.map((x) => x.celula)).size,
    multiplicador.regioes.length,
  );
});
