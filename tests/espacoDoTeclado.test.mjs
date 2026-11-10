import assert from "node:assert/strict";
import test from "node:test";

import { espacoCobertoPeloTeclado } from "../src/domain/espacoDoTeclado.ts";

// Medido num Motorola edge 70 fusion (Android 16, de ponta a ponta):
// a área vai até o fim da tela (772.68) e o teclado fica por cima dela.
test("sobe o rodapé quando o teclado fica por cima do app", () => {
  const espaco = espacoCobertoPeloTeclado(772.68, 432.89);

  assert.ok(Math.abs(espaco - 339.79) < 0.01, `espaco=${espaco}`);
});

// Medido num Motorola edge 20 (Android 13): sem teclado a área tem 936, com
// teclado ela encolhe para 624, exatamente o topo do teclado.
test("não compensa de novo quando o Android já encolheu a área do app", () => {
  assert.equal(espacoCobertoPeloTeclado(624, 624), 0);
});

test("desconta só o que o teclado cobre da área, não da tela inteira", () => {
  assert.equal(espacoCobertoPeloTeclado(936, 624), 312);
});

test("sem teclado na tela não há espaço a compensar", () => {
  assert.equal(espacoCobertoPeloTeclado(772.68, 772.68), 0);
  assert.equal(espacoCobertoPeloTeclado(772.68, 900), 0);
});
