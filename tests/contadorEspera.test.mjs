import assert from "node:assert/strict";
import test from "node:test";

import {
  calcularContadorEspera,
  formatarTempoEspera,
} from "../src/domain/contadorEspera.ts";

const resumo = {
  inicio_em: "2026-09-18T12:00:00-04:00",
  calculado_em: "2026-09-18T12:01:00-04:00",
  segundos_decorridos: 60,
  tolerancia_segundos: 120,
  limite_cobranca_segundos: 720,
  segundos_cobrados: 0,
  segundos_tolerancia_restantes: 60,
  limite_atingido: false,
  valor_por_minuto: 0.3,
  taxa_plataforma_percentual: 10,
  valor_taxa_motorista: 0,
  valor_taxa_passageiro: 0,
};

test("mostra a contagem regressiva durante os dois minutos gratuitos", () => {
  const contador = calcularContadorEspera(resumo, 30, "passageiro");

  assert.deepEqual(contador, {
    fase: "tolerancia",
    tempo: "0:30",
    apoio: "Por favor, aguarde. Taxa paga após a contagem.",
    valor: 0,
    segundosCobrados: 0,
    segundosDecorridos: 90,
    progresso: 0.25,
  });
});

test("começa a cobrança proporcional depois da tolerância", () => {
  const motorista = calcularContadorEspera(resumo, 120, "motorista");
  const passageiro = calcularContadorEspera(resumo, 120, "passageiro");

  assert.equal(motorista.fase, "cobrando");
  assert.equal(motorista.tempo, "1:00");
  assert.equal(motorista.valor, 0.3);
  assert.equal(passageiro.valor, 0.33);
  assert.equal(motorista.progresso, 60 / 720);
  assert.equal(motorista.segundosDecorridos, 180);
});

test("limita o contador e a taxa a doze minutos cobrados", () => {
  const motorista = calcularContadorEspera(resumo, 60 * 30, "motorista");
  const passageiro = calcularContadorEspera(resumo, 60 * 30, "passageiro");

  assert.equal(motorista.fase, "limite");
  assert.equal(motorista.tempo, "12:00");
  assert.equal(motorista.segundosCobrados, 720);
  assert.equal(motorista.valor, 3.6);
  assert.equal(passageiro.valor, 4);
  assert.equal(motorista.progresso, 1);
});

test("formata o relógio com minutos e segundos estáveis", () => {
  assert.equal(formatarTempoEspera(0), "0:00");
  assert.equal(formatarTempoEspera(5), "0:05");
  assert.equal(formatarTempoEspera(125), "2:05");
  assert.equal(formatarTempoEspera(720), "12:00");
});
