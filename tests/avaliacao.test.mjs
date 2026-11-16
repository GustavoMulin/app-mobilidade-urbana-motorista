import assert from "node:assert/strict";
import test from "node:test";

import {
  NOTA_MINIMA_PARA_SELOS,
  alternarSelo,
  podeEscolherSelos,
  textoDoBloqueio,
} from "../src/domain/avaliacao.ts";

test("selos só são oferecidos para notas boas", () => {
  assert.equal(NOTA_MINIMA_PARA_SELOS, 4);
  assert.equal(podeEscolherSelos(5), true);
  assert.equal(podeEscolherSelos(4), true);
  assert.equal(podeEscolherSelos(3), false);
  assert.equal(podeEscolherSelos(0), false);
});

test("escolher um selo duas vezes o desmarca e a ordem da escolha é mantida", () => {
  assert.deepEqual(alternarSelo([], "boa_rota"), ["boa_rota"]);
  assert.deepEqual(alternarSelo(["boa_rota"], "respeitoso"), [
    "boa_rota",
    "respeitoso",
  ]);
  assert.deepEqual(alternarSelo(["boa_rota", "respeitoso"], "boa_rota"), [
    "respeitoso",
  ]);
});

test("escreve quando o usuário foi bloqueado, sem quebrar com data ruim", () => {
  assert.equal(textoDoBloqueio(null), "");
  assert.equal(textoDoBloqueio("não é data"), "");
  assert.match(textoDoBloqueio("2026-11-14T12:00:00Z"), /^Bloqueado em \d{2}\/\d{2}\/2026$/);
});
