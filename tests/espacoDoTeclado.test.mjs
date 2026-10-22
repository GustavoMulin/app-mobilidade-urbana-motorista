import assert from "node:assert/strict";
import test from "node:test";

import { espacoCobertoPeloTeclado } from "../src/domain/espacoDoTeclado.ts";

// Medido num Motorola edge 70 fusion (Android 16, de ponta a ponta):
// janela 708.57, tela 772.68, topo do teclado 432.89 (coordenada de tela).
test("mede o teclado contra a tela inteira, não contra a janela", () => {
  const espaco = espacoCobertoPeloTeclado(772.68, 432.89);

  assert.ok(Math.abs(espaco - 339.79) < 0.01, `espaco=${espaco}`);
});

test("sem teclado na tela não há espaço a compensar", () => {
  assert.equal(espacoCobertoPeloTeclado(772.68, 772.68), 0);
  assert.equal(espacoCobertoPeloTeclado(772.68, 900), 0);
});
