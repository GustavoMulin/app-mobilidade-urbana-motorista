import assert from "node:assert/strict";
import test from "node:test";

import {
  classificarFalhaLocalizacao,
  comTempoLimite,
} from "../src/domain/localizacao.ts";

test("só trata como falta de permissão o erro de autorização", () => {
  assert.equal(
    classificarFalhaLocalizacao({ code: "ERR_LOCATION_UNAUTHORIZED" }),
    "sem_permissao",
  );
});

test("GPS desligado, sem Play Services ou sem sinal não é falta de permissão", () => {
  for (const code of [
    "ERR_LOCATION_SETTINGS_UNSATISFIED",
    "ERR_CURRENT_LOCATION_IS_UNAVAILABLE",
    "ERR_LOCATION_UNAVAILABLE",
    "ERR_LOCATION_REQUEST_REJECTED",
    "ERR_LOCATION_UNKNOWN",
  ]) {
    assert.equal(classificarFalhaLocalizacao({ code }), "indisponivel", code);
  }

  assert.equal(classificarFalhaLocalizacao(new Error("qualquer")), "indisponivel");
  assert.equal(classificarFalhaLocalizacao(undefined), "indisponivel");
});

test("devolve o valor quando a promessa termina antes do limite", async () => {
  assert.equal(await comTempoLimite(Promise.resolve(42), 50), 42);
});

test("rejeita quando a promessa não termina dentro do limite", async () => {
  const nunca = new Promise(() => {});

  await assert.rejects(comTempoLimite(nunca, 20), (erro) => {
    assert.equal(classificarFalhaLocalizacao(erro), "indisponivel");
    return true;
  });
});
