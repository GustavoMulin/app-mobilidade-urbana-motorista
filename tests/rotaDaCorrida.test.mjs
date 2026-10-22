// CODEX: 60 linhas criadas neste arquivo; valida embarque, destino e coordenadas inválidas com dados simulados.

import assert from "node:assert/strict";
import test from "node:test";

import {
  alvoDaCorrida,
  proximoPontoDaCorrida,
} from "../src/domain/rotaDaCorrida.ts";

const destinos = [
  {
    tipo: "origem",
    latitude: "-8.761160",
    longitude: "-63.900430",
  },
  {
    tipo: "destino",
    latitude: -8.701,
    longitude: -63.91,
  },
];

for (const status of ["aceita", "motorista_chegou"]) {
  test(`${status} desenha do motorista ate o passageiro`, () => {
    assert.deepEqual(
      alvoDaCorrida({ status_corrida: status, corrida_destinos: destinos }),
      { latitude: -8.76116, longitude: -63.90043 },
    );
  });
}

test("em andamento troca o alvo para o destino", () => {
  assert.deepEqual(
    alvoDaCorrida({
      status_corrida: "em_andamento",
      corrida_destinos: destinos,
    }),
    { latitude: -8.701, longitude: -63.91 },
  );
});

for (const status of ["solicitada", "finalizada", "cancelada"]) {
  test(`${status} nao conserva uma rota ativa`, () => {
    assert.equal(
      alvoDaCorrida({ status_corrida: status, corrida_destinos: destinos }),
      null,
    );
  });
}

test("coordenada ausente ou invalida nao gera rota", () => {
  assert.equal(
    alvoDaCorrida({
      status_corrida: "aceita",
      corrida_destinos: [
        { tipo: "origem", latitude: "invalida", longitude: null },
      ],
    }),
    null,
  );
  assert.equal(alvoDaCorrida(null), null);
});

const comParadas = [
  {
    tipo: "origem",
    ordem: 0,
    endereco: "Embarque",
    latitude: -8.76,
    longitude: -63.9,
  },
  {
    tipo: "parada",
    ordem: 2,
    endereco: "Parada B",
    latitude: -8.74,
    longitude: -63.9,
  },
  {
    tipo: "parada",
    ordem: 1,
    endereco: "Parada A",
    latitude: -8.75,
    longitude: -63.9,
  },
  {
    tipo: "destino",
    ordem: 3,
    endereco: "Destino",
    latitude: -8.73,
    longitude: -63.9,
  },
];

test("em viagem segue para a próxima parada pendente na ordem da rota", () => {
  const ponto = proximoPontoDaCorrida({
    status_corrida: "em_andamento",
    corrida_destinos: comParadas,
  });

  assert.equal(ponto.tipo, "parada");
  assert.equal(ponto.endereco, "Parada A");
  assert.equal(ponto.totalParadas, 2);
  assert.equal(ponto.paradasPendentes, 2);
});

test("parada confirmada sai da rota e o alvo avança", () => {
  const confirmadas = comParadas.map((ponto) =>
    ponto.endereco === "Parada A"
      ? { ...ponto, concluida_em: "2026-09-30T12:00:00Z" }
      : ponto,
  );
  const ponto = proximoPontoDaCorrida({
    status_corrida: "em_andamento",
    corrida_destinos: confirmadas,
  });

  assert.equal(ponto.endereco, "Parada B");
  assert.equal(ponto.paradasPendentes, 1);

  const todas = confirmadas.map((item) =>
    item.tipo === "parada"
      ? { ...item, concluida_em: "2026-09-30T12:05:00Z" }
      : item,
  );
  const final = proximoPontoDaCorrida({
    status_corrida: "em_andamento",
    corrida_destinos: todas,
  });

  assert.equal(final.tipo, "destino");
  assert.equal(final.paradasPendentes, 0);
  assert.deepEqual(final.coordenada, { latitude: -8.73, longitude: -63.9 });
});

test("antes do embarque as paradas não mudam o alvo", () => {
  assert.deepEqual(
    alvoDaCorrida({ status_corrida: "aceita", corrida_destinos: comParadas }),
    { latitude: -8.76, longitude: -63.9 },
  );
});
