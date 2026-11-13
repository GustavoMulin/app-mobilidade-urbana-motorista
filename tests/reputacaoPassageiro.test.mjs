import assert from "node:assert/strict";
import test from "node:test";

import {
  reputacaoPassageiro,
  textoDaNota,
  textoDeCorridasDoPassageiro,
} from "../src/domain/reputacaoPassageiro.ts";

test("mostra nota com duas casas e o total de corridas de quem já não é novo", () => {
  assert.equal(reputacaoPassageiro(4.94, 421, false), "4,94★ · 421 corridas");
  assert.equal(reputacaoPassageiro(5, 1, false), "5,00★ · 1 corrida");
  // sem o campo `novo` (servidor antigo) a nota continua com as corridas
  assert.equal(reputacaoPassageiro(4.94, 421), "4,94★ · 421 corridas");
});

test("conta nova aparece com a nota base e o selo Novo usuário", () => {
  assert.equal(reputacaoPassageiro(5, 0, true), "5,00★ · Novo usuário");
  assert.equal(reputacaoPassageiro(4.5, 3, true), "4,50★ · Novo usuário");
  assert.equal(reputacaoPassageiro(null, 0, true), "5,00★ · Novo usuário");
});

test("servidor antigo, sem nota: não inventa nota zero", () => {
  assert.equal(reputacaoPassageiro(null, 0), "Primeira corrida no app");
  assert.equal(
    reputacaoPassageiro(undefined, undefined),
    "Primeira corrida no app",
  );
  assert.equal(reputacaoPassageiro(null, 3), "Sem avaliações · 3 corridas");
});

test("o texto das corridas troca pelo selo enquanto o usuário é novo", () => {
  assert.equal(textoDeCorridasDoPassageiro(3, true), "Novo usuário");
  assert.equal(textoDeCorridasDoPassageiro(0), "Novo usuário");
  assert.equal(textoDeCorridasDoPassageiro(1, false), "1 corrida");
  assert.equal(textoDeCorridasDoPassageiro(25, false), "25 corridas");
  assert.equal(textoDaNota(4.9), "4,90");
  assert.equal(textoDaNota(null), null);
});
