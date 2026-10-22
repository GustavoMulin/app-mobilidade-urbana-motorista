// CODEX: 154 linhas criadas neste arquivo; valida estados, cancelamento, valores e dados reais do histórico.

import assert from "node:assert/strict";
import test from "node:test";

import { paraItemHistorico } from "../src/domain/historicoCorridas.ts";

const corridaBase = {
  id: 42,
  codigo_corrida: "PVH-42",
  status_corrida: "cancelada",
  cancelado_por: "passageiro",
  motivo_cancelamento: "Mudança de planos",
  metodo_pagamento: "pix",
  tempo_solicitacao: "2026-09-18T12:30:00.000Z",
  tempo_inicio: null,
  tempo_final: null,
  distancia_total: "6.60",
  valor_estimado_inicial: "20.00",
  produto: { nome: "Pop" },
  motorista: null,
  passageiro: {
    user: { name: "Ana Passageira", foto: null },
  },
  veiculo: null,
  corrida_financeiro: {
    valor_pago_passageiro: "22.00",
    tarifa_base: "2.10",
    taxa_plataforma_valor: "3.25",
    taxa_plataforma_percentual: "14.77",
    valor_motorista: "18.75",
    valor_liquido_motorista: "18.75",
    metodo_pagamento: "pix",
  },
  corrida_destinos: [
    { tipo: "destino", ordem: 1, endereco: "Destino registrado" },
    { tipo: "origem", ordem: 0, endereco: "Origem registrada" },
  ],
};

test("passageiro vê solicitação cancelada mesmo sem motorista atribuído", () => {
  const item = paraItemHistorico(corridaBase, "passageiro");

  assert.equal(item.id, "42");
  assert.equal(item.code, "PVH-42");
  assert.equal(item.status, "Corrida cancelada");
  assert.equal(item.statusCode, "cancelada");
  assert.equal(item.isCancelled, true);
  assert.equal(item.cancelledBy, "Passageiro");
  assert.equal(item.cancellationReason, "Mudança de planos");
  assert.equal(item.counterpartName, "Não definido");
  assert.equal(item.value, "R$ 22,00");
  assert.equal(item.valueLabel, "Valor estimado");
  assert.equal(item.origin, "Origem registrada");
  assert.equal(item.destination, "Destino registrado");
});

// CODEX: taxa de ausência deve aparecer com rótulo próprio para as duas partes.
test("histórico identifica cancelamento com tarifa base por ausência", () => {
  const corrida = {
    ...corridaBase,
    tipo_cancelamento: "nao_comparecimento",
    cancelado_por: "motorista",
    corrida_financeiro: {
      ...corridaBase.corrida_financeiro,
      taxa_cancelamento: "2.10",
      valor_pago_passageiro: "2.10",
      valor_liquido_motorista: "2.10",
    },
  };

  for (const perspectiva of ["motorista", "passageiro"]) {
    const item = paraItemHistorico(corrida, perspectiva);
    assert.equal(item.isNoShow, true);
    assert.equal(item.value, "R$ 2,10");
    assert.equal(item.valueLabel, "Taxa por ausência");
    assert.match(item.paymentSummary, /Taxa de cancelamento/);
  }
});

test("motorista vê os dados persistidos da corrida finalizada", () => {
  const item = paraItemHistorico(
    {
      ...corridaBase,
      status_corrida: "finalizada",
      cancelado_por: null,
      motivo_cancelamento: null,
      tempo_inicio: "2026-09-18T12:40:00.000Z",
      tempo_final: "2026-09-18T13:08:00.000Z",
      motorista: {
        user: { name: "Carlos Motorista", foto: null },
      },
      veiculo: {
        modelo: "Onix",
        cor: "Prata",
        placa: "ABC1D23",
      },
    },
    "motorista",
  );

  assert.equal(item.status, "Corrida finalizada");
  assert.equal(item.isFinalized, true);
  assert.equal(item.counterpartName, "Ana Passageira");
  assert.equal(item.value, "R$ 18,75");
  assert.equal(item.valueLabel, "Você ganhou");
  assert.equal(item.passengerPaid, "R$ 22,00");
  assert.equal(item.baseFare, "R$ 2,10");
  assert.equal(item.platformFee, "R$ 3,25");
  assert.equal(item.platformPercentage, "14,77%");
  assert.equal(item.duration, "28 min");
  assert.equal(item.distance, "6,6 km");
});

test("passageiro vê motorista e veículo quando houve atribuição", () => {
  const item = paraItemHistorico(
    {
      ...corridaBase,
      status_corrida: "aceita",
      motorista: {
        user: { name: "Carlos Motorista", foto: null },
      },
      veiculo: {
        modelo: "Onix",
        cor: "Prata",
        placa: "ABC1D23",
      },
    },
    "passageiro",
  );

  assert.equal(item.counterpartName, "Carlos Motorista");
  assert.equal(item.vehicle, "Onix · Prata · ABC1D23");
  assert.equal(item.status, "Motorista a caminho");
  assert.equal(item.valueLabel, "Valor estimado");
});

test("campos incompletos usam marcadores seguros", () => {
  const item = paraItemHistorico(
    {
      id: 7,
      status_corrida: "solicitada",
      corrida_destinos: [],
    },
    "passageiro",
  );

  assert.equal(item.value, "—");
  assert.equal(item.distance, "—");
  assert.equal(item.duration, "—");
  assert.equal(item.origin, "Não informado");
  assert.equal(item.destination, "Não informado");
  assert.equal(item.paymentLabel, "Não informado");
});
