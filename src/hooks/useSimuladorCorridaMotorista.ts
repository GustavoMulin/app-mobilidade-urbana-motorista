// CODEX: 235 linhas criadas; simula localmente todo o fluxo do motorista. Remover após validação/commit.
import type { ResumoEspera } from "@/domain/contadorEspera";
import type { RotaNavegacao } from "@/domain/navegacao";
import type {
  ChegadaEstimada,
  CorridaEmCurso,
  OfertaCorrida,
  PassageiroDaCorrida,
  ResultadoCancelamento,
} from "@/hooks/useDespachoMotorista";
import { useToast } from "@/context/ToastContext";
import { useCallback, useMemo, useState } from "react";

export const ETAPAS_SIMULACAO_MOTORISTA = [
  "oferta",
  "aceita",
  "motorista_chegou",
  "em_andamento",
] as const;

export type EtapaSimulacaoMotorista =
  (typeof ETAPAS_SIMULACAO_MOTORISTA)[number];

const MOTORISTA_INICIAL = { latitude: -8.7062, longitude: -63.8811 };
const EMBARQUE = { latitude: -8.7023595, longitude: -63.8765456 };
const MEIO_DA_VIAGEM = { latitude: -8.7086, longitude: -63.8814 };
const DESTINO = { latitude: -8.7148, longitude: -63.8846 };

const ENDERECO_EMBARQUE =
  "Rua Santa Luzia, 600 - Nova Esperança, Porto Velho - RO";
const ENDERECO_DESTINO = "Porto Velho Shopping - Porto Velho, RO";

const rota = (
  pontos: { latitude: number; longitude: number }[],
  distancia_m: number,
  duracao_s: number,
  rua: string,
): RotaNavegacao => ({
  distancia_m,
  duracao_s,
  polyline: pontos,
  passos: [
    {
      manobra: "straight",
      instrucao: `Siga em frente pela ${rua}`,
      rua,
      distancia_m,
      duracao_s,
      inicio: pontos[0],
      fim: pontos[pontos.length - 1],
      polyline: pontos,
    },
  ],
});

const ROTA_ATE_EMBARQUE = rota(
  [
    MOTORISTA_INICIAL,
    { latitude: -8.7048, longitude: -63.8794 },
    { latitude: -8.7035, longitude: -63.8778 },
    EMBARQUE,
  ],
  1100,
  180,
  "Rua Santa Luzia",
);

const ROTA_ATE_DESTINO = rota(
  [
    MEIO_DA_VIAGEM,
    { latitude: -8.7102, longitude: -63.8822 },
    { latitude: -8.7127, longitude: -63.8832 },
    DESTINO,
  ],
  4200,
  480,
  "Avenida Rio Madeira",
);

const passageiro: PassageiroDaCorrida = {
  nome: "Lucas",
  foto: null,
  foto_oculta: true,
  telefone: "69999999999",
  nota: 4.86,
  corridas: 39,
};

const oferta: OfertaCorrida = {
  corrida_id: -9_101,
  codigo_corrida: "DEV-MOTORISTA",
  distancia_ate_origem_km: 1.1,
  distancia_corrida_km: 4.2,
  valor_motorista: 15.21,
  origem: ENDERECO_EMBARQUE,
  destino: ENDERECO_DESTINO,
  paradas: 0,
  passageiro_nota: passageiro.nota,
  passageiro_corridas: passageiro.corridas,
};

// várias chamadas seguidas: uma aparece assim que a anterior é aceita ou
// recusada, para treinar a sequência (inclusive pelo gesto)
const variacoes: [string, string, number, number, number, number][] = [
  // origem, destino, valor, km até a origem, km da corrida, nota
  [ENDERECO_EMBARQUE, ENDERECO_DESTINO, 15.21, 1.1, 4.2, 4.86],
  [
    "Av. Sete de Setembro, 1200 - Centro, Porto Velho - RO",
    "Aeroporto Internacional de Porto Velho - RO",
    32.9,
    2.4,
    9.8,
    4.95,
  ],
  [
    "Rua Dom Pedro II, 637 - Caiari, Porto Velho - RO",
    "Hospital de Base - Porto Velho, RO",
    9.75,
    0.6,
    2.1,
    4.7,
  ],
  [
    "Av. Jorge Teixeira, 3500 - Embratel, Porto Velho - RO",
    "Estrada de Ferro Madeira-Mamoré - Porto Velho, RO",
    18.4,
    3.2,
    6.3,
    4.55,
  ],
  [
    "Rua Almirante Barroso, 1485 - Centro, Porto Velho - RO",
    "Universidade Federal de Rondônia - Porto Velho, RO",
    41.6,
    1.8,
    14.5,
    4.99,
  ],
];
const OFERTAS_EM_SEQUENCIA: OfertaCorrida[] = variacoes.map(
  ([origem, destino, valor, ateOrigem, corridaKm, nota], indice) => ({
    ...oferta,
    corrida_id: -9_201 - indice,
    codigo_corrida: `DEV-SEQUENCIA-${indice + 1}`,
    origem,
    destino,
    valor_motorista: valor,
    distancia_ate_origem_km: ateOrigem,
    distancia_corrida_km: corridaKm,
    passageiro_nota: nota,
    passageiro_corridas: 12 + indice * 17,
  }),
);
export const QUANTIDADE_EM_SEQUENCIA = OFERTAS_EM_SEQUENCIA.length;

export function useSimuladorCorridaMotorista() {
  const { mostrarToast } = useToast();
  const [etapa, setEtapa] = useState<EtapaSimulacaoMotorista | null>(null);
  const [finalizada, setFinalizada] = useState(false);
  const [inicioEspera, setInicioEspera] = useState<string | null>(null);
  // as chamadas da sequência que faltam (a primeira é a que está na tela)
  const [fila, setFila] = useState<OfertaCorrida[]>([]);
  const [placar, setPlacar] = useState({ aceitas: 0, recusadas: 0 });

  const selecionarEtapa = useCallback((nova: EtapaSimulacaoMotorista) => {
    setFinalizada(false);
    setFila([]);
    setEtapa(nova);
    setInicioEspera(
      nova === "motorista_chegou" ? new Date().toISOString() : null,
    );
  }, []);

  const iniciar = useCallback(() => selecionarEtapa("oferta"), [selecionarEtapa]);

  const receberVarias = useCallback(() => {
    selecionarEtapa("oferta");
    setFila(OFERTAS_EM_SEQUENCIA);
    setPlacar({ aceitas: 0, recusadas: 0 });
  }, [selecionarEtapa]);

  const finalizar = useCallback(() => {
    setEtapa(null);
    setInicioEspera(null);
    setFila([]);
    setFinalizada(true);
  }, []);

  const encerrar = useCallback(() => {
    setEtapa(null);
    setInicioEspera(null);
    setFila([]);
    setFinalizada(false);
  }, []);

  // na sequência, a resposta só conta no placar e já chama a próxima
  const responderNaSequencia = useCallback(
    (resposta: "aceitas" | "recusadas") => {
      const novo = { ...placar, [resposta]: placar[resposta] + 1 };
      setPlacar(novo);
      if (fila.length > 1) {
        setFila(fila.slice(1));
        return;
      }
      encerrar();
      mostrarToast({
        tipo: "info",
        titulo: "Sequência simulada concluída",
        mensagem: `${novo.aceitas} aceita(s) e ${novo.recusadas} recusada(s).`,
        chave: "simulacao:sequencia",
      });
    },
    [encerrar, fila, mostrarToast, placar],
  );

  const aceitar = useCallback(
    () =>
      fila.length > 0
        ? responderNaSequencia("aceitas")
        : selecionarEtapa("aceita"),
    [fila.length, responderNaSequencia, selecionarEtapa],
  );

  // recusar, ou deixar o tempo da chamada acabar
  const recusar = useCallback(
    () => (fila.length > 0 ? responderNaSequencia("recusadas") : encerrar()),
    [encerrar, fila.length, responderNaSequencia],
  );

  const avancar = useCallback(
    (acao: "cheguei" | "iniciar" | "confirmar-parada" | "finalizar") => {
      if (acao === "cheguei") selecionarEtapa("motorista_chegou");
      if (acao === "iniciar") selecionarEtapa("em_andamento");
      if (acao === "finalizar") finalizar();
    },
    [finalizar, selecionarEtapa],
  );

  const cancelar = useCallback(async (): Promise<ResultadoCancelamento> => {
    encerrar();
    return { ok: true };
  }, [encerrar]);

  const dados = useMemo(() => {
    if (etapa === null) return null;

    const emOferta = etapa === "oferta";
    const corrida: CorridaEmCurso | null = emOferta
      ? null
      : {
          id: -9_101,
          codigo_corrida: "DEV-MOTORISTA",
          status_corrida: etapa,
          corrida_destinos: [
            {
              tipo: "origem",
              ordem: 0,
              endereco: ENDERECO_EMBARQUE,
              latitude: EMBARQUE.latitude,
              longitude: EMBARQUE.longitude,
            },
            {
              tipo: "destino",
              ordem: 1,
              endereco: ENDERECO_DESTINO,
              latitude: DESTINO.latitude,
              longitude: DESTINO.longitude,
            },
          ],
          corrida_financeiro: { metodo_pagamento: "dinheiro" },
          produto: { id: -1, nome: "Pop" },
        };
    const posicao =
      etapa === "motorista_chegou"
        ? EMBARQUE
        : etapa === "em_andamento"
          ? MEIO_DA_VIAGEM
          : MOTORISTA_INICIAL;
    const chegada: ChegadaEstimada | null = emOferta
      ? null
      : etapa === "em_andamento"
        ? { minutos: 8, distancia_km: 4.2, alvo: "destino" }
        : {
            minutos: etapa === "aceita" ? 3 : 0,
            distancia_km: etapa === "aceita" ? 1.1 : 0,
            alvo: "origem",
          };
    const instante = inicioEspera ?? new Date().toISOString();
    const espera: ResumoEspera | null =
      etapa === "motorista_chegou"
        ? {
            inicio_em: instante,
            calculado_em: instante,
            segundos_decorridos: 0,
            tolerancia_segundos: 120,
            limite_cobranca_segundos: 720,
            segundos_cobrados: 0,
            segundos_tolerancia_restantes: 120,
            limite_atingido: false,
            valor_por_minuto: 0.5,
            taxa_plataforma_percentual: 20,
            valor_taxa_motorista: 0,
            valor_taxa_passageiro: 0,
          }
        : null;

    return {
      oferta: emOferta ? (fila[0] ?? oferta) : null,
      corrida,
      chegada,
      espera,
      passageiro: emOferta ? null : passageiro,
      posicao,
      rotaNavegacao:
        etapa === "aceita"
          ? ROTA_ATE_EMBARQUE
          : etapa === "em_andamento"
            ? ROTA_ATE_DESTINO
            : null,
    };
  }, [etapa, fila, inicioEspera]);

  return {
    ativa: etapa !== null,
    etapa,
    finalizada,
    // quantas chamadas da sequência faltam, contando a da tela (0: fora dela)
    restantes: fila.length,
    dados,
    iniciar,
    receberVarias,
    aceitar,
    recusar,
    selecionarEtapa,
    avancar,
    cancelar,
    finalizar,
    encerrar,
  };
}
