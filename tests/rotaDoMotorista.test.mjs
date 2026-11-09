import assert from "node:assert/strict";
import test from "node:test";

import { rotaDoMotorista } from "../src/domain/rotaDoMotorista.ts";

test("cadastro não aprovado vai direto para a liberação", () => {
  for (const status of ["pendente", "em_analise", "reprovado"]) {
    assert.equal(rotaDoMotorista(status), "/liberacao");
  }
});

test("motorista aprovado vai para a home", () => {
  assert.equal(rotaDoMotorista("ativo"), "/home");
  assert.equal(rotaDoMotorista("aprovado"), "/home");
});

test("sem situação conhecida segue para a home", () => {
  assert.equal(rotaDoMotorista(null), "/home");
  assert.equal(rotaDoMotorista(undefined), "/home");
});
