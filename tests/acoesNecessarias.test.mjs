import assert from "node:assert/strict";
import test from "node:test";

import { itensDasAcoes } from "../src/domain/acoesNecessarias.ts";

const abrir = { documento: () => {}, veiculos: () => {}, permissoes: () => {} };
const titulos = (cadastro, permissoes = []) =>
  itensDasAcoes(cadastro, permissoes, abrir).map((item) => item.titulo);

test("vários veículos em análise viram uma linha só, com as placas", () => {
  const itens = itensDasAcoes(
    {
      acoes_necessarias: ["cnh"],
      documentos: [
        { tipo_documento: "cnh", status: "aprovado", vencido: true },
      ],
      veiculos_em_analise: [
        { nome: "FORD FIESTA", placa: "ITC0C27" },
        { nome: "RENAULT KWID", placa: "UAM1I27" },
      ],
    },
    [],
    abrir,
  );

  assert.deepEqual(
    itens.map((item) => [item.titulo, item.detalhe]),
    [
      ["CNH", "Documento vencido · envie um novo"],
      ["2 veículos em análise", "Placas ITC0C27 e UAM1I27"],
    ],
  );
});

test("falta de veículo vem primeiro e as permissões por último", () => {
  assert.deepEqual(
    titulos(
      {
        acoes_necessarias: ["seguro_obrigatorio", "veiculo"],
        documentos: [
          { tipo_documento: "seguro_obrigatorio", status: "reprovado" },
        ],
      },
      ["câmera", "localização"],
    ),
    ["Cadastre um veículo", "Seguro obrigatório", "Ative as permissões do app"],
  );
});

test("documento nunca enviado pede o primeiro envio", () => {
  const [item] = itensDasAcoes(
    { acoes_necessarias: ["nada_consta"], documentos: [] },
    [],
    abrir,
  );

  assert.deepEqual(
    [item.titulo, item.detalhe],
    ["Antecedentes criminais", "Documento não enviado · envie agora"],
  );
});

test("documento enviado continua na lista, só informando a análise", () => {
  const itens = itensDasAcoes(
    {
      acoes_necessarias: [],
      documentos: [
        { tipo_documento: "cnh", status: "em_analise" },
        { tipo_documento: "crlv", status: "em_analise" },
        { tipo_documento: "seguro_obrigatorio", status: "aprovado" },
      ],
    },
    [],
    abrir,
  );

  assert.deepEqual(
    itens.map((item) => [item.titulo, item.detalhe, item.onPress]),
    [["CNH", "Documento enviado · em análise", undefined]],
  );
});

test("sem cadastro e com tudo permitido não há ações", () => {
  assert.deepEqual(titulos(null), []);
});
