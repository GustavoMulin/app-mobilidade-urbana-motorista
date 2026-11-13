import assert from "node:assert/strict";
import test from "node:test";

import { textoDaNotaDoMotorista } from "../src/domain/notaDoMotorista.ts";

test("mostra a média com duas casas e vírgula", () => {
  assert.equal(textoDaNotaDoMotorista(4.92), "4,92");
  assert.equal(textoDaNotaDoMotorista(5), "5,00");
  assert.equal(textoDaNotaDoMotorista(4.3), "4,30");
});

test("quem ainda não foi avaliado não aparece com nota zero", () => {
  assert.equal(textoDaNotaDoMotorista(null), "Sem avaliações");
  assert.equal(textoDaNotaDoMotorista(undefined), "Sem avaliações");
});
