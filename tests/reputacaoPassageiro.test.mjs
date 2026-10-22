import assert from "node:assert/strict";
import test from "node:test";

import { reputacaoPassageiro } from "../src/domain/reputacaoPassageiro.ts";

test("mostra nota com duas casas e o total de corridas", () => {
  assert.equal(reputacaoPassageiro(4.94, 421), "4,94★ · 421 corridas");
  assert.equal(reputacaoPassageiro(5, 1), "5,00★ · 1 corrida");
});

test("não mostra nota zero para quem ainda não foi avaliado", () => {
  assert.equal(reputacaoPassageiro(null, 0), "Primeira corrida no app");
  assert.equal(
    reputacaoPassageiro(undefined, undefined),
    "Primeira corrida no app",
  );
  assert.equal(reputacaoPassageiro(null, 3), "Sem avaliações · 3 corridas");
});
