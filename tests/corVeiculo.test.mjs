import assert from "node:assert/strict";
import test from "node:test";

import { COR_PADRAO, corDoVeiculo } from "../src/domain/corVeiculo.ts";

test("converte as cores do CRLV e do cadastro em hexadecimal", () => {
  assert.equal(corDoVeiculo("PRETA"), "#111111");
  assert.equal(corDoVeiculo("Preto"), "#111111");
  assert.equal(corDoVeiculo("BRANCA"), "#F7F7F7");
  assert.equal(corDoVeiculo("branco"), "#F7F7F7");
  assert.equal(corDoVeiculo("VERMELHA"), "#C62828");
  assert.equal(corDoVeiculo("Prateado"), corDoVeiculo("PRATA"));
});

test("ignora acento, espaços e o que vem depois da cor", () => {
  assert.equal(corDoVeiculo("GRENÁ"), corDoVeiculo("VINHO"));
  assert.equal(corDoVeiculo("  preto  "), "#111111");
  assert.equal(corDoVeiculo("CINZA ESCURO"), corDoVeiculo("CINZA"));
  assert.equal(corDoVeiculo("Azul-marinho"), corDoVeiculo("AZUL"));
});

test("cor desconhecida ou ausente usa a cor padrão", () => {
  for (const cor of ["FANTASIA", "Xadrez", "", "   ", null, undefined]) {
    assert.equal(corDoVeiculo(cor), COR_PADRAO);
  }
});
