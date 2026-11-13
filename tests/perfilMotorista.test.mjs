import assert from "node:assert/strict";
import test from "node:test";

import {
  coresDaFaixa,
  combinaComBusca,
  formatarTelefone,
  inicialDoNome,
  larguraDaBarra,
  tempoNaPlataforma,
  textoDaMedia,
  textoDasFaixas,
  textoDeQuando,
  totalDaDistribuicao,
} from "../src/domain/perfilMotorista.ts";

test("explica as faixas da nota com os limites definidos na gestão", () => {
  assert.equal(
    textoDasFaixas({ excelente_acima: 4.85, alto_risco_abaixo: 4.51 }),
    "Excelente: acima de 4,85 · Atenção: de 4,51 a 4,85 · Alto risco: abaixo de 4,51",
  );
  assert.equal(
    textoDasFaixas({ excelente_acima: 4.9, alto_risco_abaixo: 4 }),
    "Excelente: acima de 4,90 · Atenção: de 4,00 a 4,90 · Alto risco: abaixo de 4,00",
  );
});

test("cada faixa tem a sua cor: verde, âmbar e vermelho", () => {
  assert.equal(coresDaFaixa("excelente").texto, "#18794E");
  assert.equal(coresDaFaixa("atencao").texto, "#9A6700");
  assert.equal(coresDaFaixa("alto_risco").texto, "#B3261E");
});

test("a largura da barra é a fatia de cada nota e não quebra sem avaliações", () => {
  assert.equal(larguraDaBarra(89, 100), 89);
  assert.equal(larguraDaBarra(1, 3), 33);
  assert.equal(larguraDaBarra(0, 0), 0);
  assert.equal(totalDaDistribuicao({ 5: 3, 4: 1, 3: 0, 2: 0, 1: 2 }), 6);
});

test("mostra o tempo na plataforma em meses e depois em anos", () => {
  assert.deepEqual(tempoNaPlataforma(0), { valor: "0", rotulo: "Meses" });
  assert.deepEqual(tempoNaPlataforma(1), { valor: "1", rotulo: "Mês" });
  assert.deepEqual(tempoNaPlataforma(11), { valor: "11", rotulo: "Meses" });
  assert.deepEqual(tempoNaPlataforma(12), { valor: "1", rotulo: "Ano" });
  assert.deepEqual(tempoNaPlataforma(30), { valor: "2", rotulo: "Anos" });
});

test("escreve há quanto tempo a nota de agradecimento chegou", () => {
  const agora = new Date("2026-11-14T12:00:00Z");
  const antes = (ms) => new Date(agora.getTime() - ms).toISOString();
  const hora = 3600000;
  const dia = 24 * hora;

  assert.equal(textoDeQuando(null, agora), "");
  assert.equal(textoDeQuando(antes(5 * 60000), agora), "agora há pouco");
  assert.equal(textoDeQuando(antes(3 * hora), agora), "3 horas atrás");
  assert.equal(textoDeQuando(antes(1 * dia + hora), agora), "1 dia atrás");
  assert.equal(textoDeQuando(antes(35 * dia), agora), "1 mês atrás");
  assert.equal(textoDeQuando(antes(150 * dia), agora), "5 meses atrás");
  assert.equal(textoDeQuando(antes(800 * dia), agora), "2 anos atrás");
});

test("explica de onde vem a nota: base ou média das últimas avaliações", () => {
  assert.equal(
    textoDaMedia({ nota_base: true, avaliacoes: 0, janela_da_media: 200 }),
    "Nota inicial: você ainda não recebeu avaliações dos passageiros",
  );
  assert.equal(
    textoDaMedia({ nota_base: false, avaliacoes: 1, janela_da_media: 200 }),
    "Média de 1 avaliação de corridas",
  );
  assert.equal(
    textoDaMedia({ nota_base: false, avaliacoes: 37, janela_da_media: 200 }),
    "Média de 37 avaliações de corridas",
  );
  assert.equal(
    textoDaMedia({ nota_base: false, avaliacoes: 200, janela_da_media: 200 }),
    "Média das 200 últimas avaliações de corridas",
  );
});

test("o avatar de quem avaliou usa a inicial do nome", () => {
  assert.equal(inicialDoNome("amanda"), "A");
  assert.equal(inicialDoNome("  deivison"), "D");
  assert.equal(inicialDoNome(""), "?");
});

test("o telefone aparece com DDD e traço, também enquanto é digitado", () => {
  assert.equal(formatarTelefone("69999990001"), "(69) 99999-0001");
  assert.equal(formatarTelefone("6932210001"), "(69) 3221-0001");
  assert.equal(formatarTelefone("(69) 99999-0001"), "(69) 99999-0001");
  assert.equal(formatarTelefone("69"), "69");
  assert.equal(formatarTelefone("699"), "(69) 9");
  // o formato de celular só entra no 11º dígito
  assert.equal(formatarTelefone("6999999"), "(69) 9999-9");
  assert.equal(formatarTelefone("699999900019"), "(69) 99999-0001");
  assert.equal(formatarTelefone(""), "");
});

test("a busca de estado e cidade ignora acento e maiúscula", () => {
  assert.equal(combinaComBusca("rondonia", "Rondônia", "RO"), true);
  assert.equal(combinaComBusca("ro", "Rondônia", "RO"), true);
  assert.equal(combinaComBusca(" SAO JOAO ", "São João del Rei"), true);
  assert.equal(combinaComBusca("velho", "Porto Velho"), true);
  assert.equal(combinaComBusca("ariquemes", "Porto Velho"), false);
  assert.equal(combinaComBusca("", "Porto Velho"), true);
});
