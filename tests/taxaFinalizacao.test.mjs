import assert from "node:assert/strict";
import test from "node:test";

import {
  anguloDoValor,
  avisoDaSituacaoTaxa,
  corDaTaxa,
  polar,
  rotuloDia,
  rotuloDiaCurto,
  rotuloPeriodo,
  tempoPorExtenso,
  textoDuracoes,
} from "../src/domain/taxaFinalizacao.ts";

test("escreve o tempo em minutos quando é redondo e em segundos nos demais casos", () => {
  assert.equal(tempoPorExtenso(120), "2 minutos");
  assert.equal(tempoPorExtenso(60), "1 minuto");
  assert.equal(tempoPorExtenso(90), "90 segundos");
  assert.equal(tempoPorExtenso(1), "1 segundo");
});

test("o medidor vai de 150° (0%) a 390° (100%) e limita valores fora da faixa", () => {
  assert.equal(anguloDoValor(0), 150);
  assert.equal(anguloDoValor(50), 270);
  assert.equal(anguloDoValor(70), 318);
  assert.equal(anguloDoValor(100), 390);
  assert.equal(anguloDoValor(-10), 150);
  assert.equal(anguloDoValor(130), 390);
});

test("calcula pontos do círculo com 0° às 3 horas e y para baixo", () => {
  assert.deepEqual(polar(100, 100, 50, 0), { x: 150, y: 100 });
  assert.deepEqual(polar(100, 100, 50, 90), { x: 100, y: 150 });
  assert.deepEqual(polar(100, 100, 50, 270), { x: 100, y: 50 });
});

test("a cor muda no mínimo: abaixo vermelho, no mínimo ou acima verde", () => {
  assert.equal(corDaTaxa(69, 70), "#FF4444");
  assert.equal(corDaTaxa(70, 70), "#18C27A");
  assert.equal(corDaTaxa(100, 70), "#18C27A");
});

test("formata os rótulos de data sem depender do fuso do aparelho", () => {
  assert.equal(rotuloDia("2026-10-06"), "06 de out");
  assert.equal(rotuloDiaCurto("2026-11-12"), "11/12");
  assert.equal(
    rotuloPeriodo("2026-10-14", "2026-11-12"),
    "14 de out – 12 de nov",
  );
  assert.equal(
    rotuloPeriodo("2026-10-13", "2026-11-11", "-"),
    "13 de out-11 de nov",
  );
});

test("escreve as durações da restrição por extenso", () => {
  assert.equal(textoDuracoes([5, 10, 15]), "5, 10 ou 15 dias");
  assert.equal(textoDuracoes([5, 10]), "5 ou 10 dias");
  assert.equal(textoDuracoes([7]), "7 dias");
  assert.equal(textoDuracoes([]), "alguns dias");
});

test("avisa do alerta e da restrição, e fica quieto quando está em dia", () => {
  assert.equal(avisoDaSituacaoTaxa(undefined), null);
  assert.equal(
    avisoDaSituacaoTaxa({
      estado: "em_dia",
      prazo_ate: null,
      restricao_ate: null,
      faltam_corridas: null,
    }),
    null,
  );
  assert.equal(
    avisoDaSituacaoTaxa({
      estado: "alerta",
      prazo_ate: "2026-11-14T23:59:59-04:00",
      restricao_ate: null,
      faltam_corridas: 3,
    }),
    "Taxa de finalização abaixo do mínimo. Recupere até 14/11 para evitar a restrição de corridas. Faltam 3 corridas finalizadas.",
  );
  assert.equal(
    avisoDaSituacaoTaxa({
      estado: "restrito",
      prazo_ate: null,
      restricao_ate: "2026-11-20T00:10:00-04:00",
      faltam_corridas: null,
    }),
    "Sua conta está com restrição de corridas até 20/11.",
  );
});
