import assert from "node:assert/strict";
import test from "node:test";

import { situacaoNaLiberacao } from "../src/domain/situacaoNaLiberacao.ts";

const cadastro = (documentos, situacao = "pendente") => ({
  situacao,
  documentos: documentos.map(([tipo_documento, status]) => ({
    tipo_documento,
    status,
  })),
});

const OS_QUATRO = ["cnh", "crlv", "nada_consta", "seguro_obrigatorio"];

test("sem cadastro carregado", () => {
  assert.equal(situacaoNaLiberacao(null), "sem_cadastro");
});

test("faltando documento continua incompleto", () => {
  const tres = OS_QUATRO.slice(1).map((tipo) => [tipo, "em_analise"]);

  assert.equal(situacaoNaLiberacao(cadastro(tres)), "pendente");
});

test("os 4 enviados aguardam a análise", () => {
  const todos = OS_QUATRO.map((tipo) => [tipo, "em_analise"]);

  assert.equal(situacaoNaLiberacao(cadastro(todos)), "em_analise");
});

test("documento recusado precisa de novo envio", () => {
  const todos = OS_QUATRO.map((tipo, indice) => [
    tipo,
    indice === 0 ? "reprovado" : "em_analise",
  ]);

  assert.equal(situacaoNaLiberacao(cadastro(todos)), "pendente");
});

test("situação definida pela gestão não muda", () => {
  const todos = OS_QUATRO.map((tipo) => [tipo, "em_analise"]);

  assert.equal(situacaoNaLiberacao(cadastro(todos, "reprovado")), "reprovado");
});
