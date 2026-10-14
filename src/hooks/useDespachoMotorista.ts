// CODEX: 33 linhas adicionadas e 11 removidas no diff atual; pausa rede e GPS durante a simulação local. Remover após validação/commit.
import { api } from "@/Services/api";
import { obterEcho } from "@/Services/echo";
import { useToast } from "@/context/ToastContext";
import { ResumoEspera } from "@/domain/contadorEspera";
import { comTempoLimite } from "@/domain/localizacao";
import { proximoPontoDaCorrida } from "@/domain/rotaDaCorrida";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

const INTERVALO_BUSCA_SEM_SOCKET_MS = 5000;
const INTERVALO_BUSCA_COM_SOCKET_MS = 30000;
const INTERVALO_POSICAO_MS = 8000;

// a chamada que toca (e aparece na tela) é a primeira corrida que o motorista
// ainda não recusou, dispensou nem respondeu com uma proposta; o resto fica
// só na lista de solicitações
const chamadaDaVez = (
  lista: OfertaCorrida[],
  dispensadas: Set<number>,
): OfertaCorrida | null =>
  lista.find(
    (item) =>
      !item.recusada_localmente &&
      !dispensadas.has(item.corrida_id) &&
      !item.minha_proposta,
  ) ?? null;

export interface OfertaCorrida {
  corrida_id: number;
  codigo_corrida: string;
  distancia_ate_origem_km: number;
  distancia_corrida_km: number;
  valor_motorista: number;
  origem: string;
  destino: string | null;
  paradas: number;
  para_outra_pessoa?: boolean;
  // nome da categoria que este motorista atende no pedido (Pop, Moto...)
  categoria?: string | null;
  metodo_pagamento?: string | null;
  // Negocia: o motorista manda proposta e o passageiro escolhe
  negociavel?: boolean;
  minha_proposta?: PropostaEnviada | null;
  passageiro_nota: number | null;
  passageiro_corridas: number;
  recusada_localmente?: boolean;
}

export interface PropostaEnviada {
  valor_motorista: number | null;
  status: string;
  expira_em: string | null;
}

// a corrida que acabou de ser cancelada, para o aviso dizer quem cancelou
interface CorridaEncerrada {
  id: number;
  cancelado_por: string | null;
  taxa_cancelamento: number;
}

export interface CorridaEmCurso {
  id: number;
  codigo_corrida: string;
  status_corrida: string;
  corrida_destinos?: {
    tipo: string;
    ordem?: number | null;
    endereco: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    concluida_em?: string | null;
  }[];
  corrida_financeiro?: {
    metodo_pagamento: string | null;
    valor_motorista?: number | string | null;
  } | null;
  produto?: { id: number; nome: string } | null;
  metodo_pagamento?: string | null;
  tempo_aceite?: string | null;
  // Negocia no Pix/cartão: até quando o motorista escolhido espera o pagamento
  pagamento_expira_em?: string | null;
}

// pedido do passageiro para trocar o destino (backend: AlterarCorridaService)
export interface PedidoNovoDestino {
  id: number;
  status: string;
  // trajeto inteiro pedido (paradas e destino) quando o passageiro editou as paradas
  paradas?: string[] | null;
  endereco: string;
  distancia_km: number;
  tempo_min: number;
  valor_motorista: number;
  valor_motorista_anterior: number | null;
  expira_em: string | null;
}

const ROTULO_PAGAMENTO: Record<string, string> = {
  dinheiro: "dinheiro",
  pix: "Pix",
  cartao: "cartão",
};

export interface PassageiroDaCorrida {
  nome: string;
  // quem pediu, quando a corrida é para outra pessoa
  solicitante?: string | null;
  foto: string | null;
  foto_oculta?: boolean;
  telefone: string | null;
  nota: number | null;
  corridas: number;
}

// o cancelamento acontece dentro da tela Mais (um Modal), que cobre os
// toasts: quem chama mostra a mensagem de erro ali mesmo
export type ResultadoCancelamento =
  | { ok: true }
  | { ok: false; mensagem: string };

export interface ChegadaEstimada {
  minutos: number;
  distancia_km: number;
  alvo: "origem" | "destino";
}

const mensagemDoErro = (erro: unknown, padrao: string) => {
  const resposta = (erro as { response?: { data?: { message?: string } } })
    ?.response;

  return resposta?.data?.message ?? padrao;
};

export function useDespachoMotorista(pausado = false) {
  const { mostrarToast } = useToast();
  const [disponivel, setDisponivel] = useState(false);
  const [oferta, setOferta] = useState<OfertaCorrida | null>(null);
  const [ofertas, setOfertas] = useState<OfertaCorrida[]>([]);
  const [carregandoOfertas, setCarregandoOfertas] = useState(false);
  const [corrida, setCorrida] = useState<CorridaEmCurso | null>(null);
  const [chegada, setChegada] = useState<ChegadaEstimada | null>(null);
  const [espera, setEspera] = useState<ResumoEspera | null>(null);
  const [pedidoNovoDestino, setPedidoNovoDestino] =
    useState<PedidoNovoDestino | null>(null);
  const [respondendoPedido, setRespondendoPedido] = useState(false);
  const [passageiro, setPassageiro] = useState<PassageiroDaCorrida | null>(
    null,
  );
  // o servidor recusa com 403 + situacao quando o cadastro ainda não foi
  // aprovado; a home usa isso para mandar o motorista para a liberação
  const [precisaLiberacao, setPrecisaLiberacao] = useState(false);
  const [posicao, setPosicao] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [socketAtivo, setSocketAtivo] = useState(false);
  const [gatilho, setGatilho] = useState(0);
  const [appAtivo, setAppAtivo] = useState(AppState.currentState === "active");

  const recusadas = useRef<Set<number>>(new Set());
  const dispensadas = useRef<Set<number>>(new Set());
  const propostasMandadas = useRef<Set<number>>(new Set());
  const corridaRef = useRef<CorridaEmCurso | null>(null);

  const aplicarCorrida = useCallback(
    (
      nova: CorridaEmCurso | null,
      avisarEncerramento = true,
      encerrada?: CorridaEncerrada | null,
    ) => {
      const anterior = corridaRef.current;

      if (avisarEncerramento && anterior !== null && nova === null) {
        setDisponivel(true);

        const canceladaPeloPassageiro =
          encerrada?.id === anterior.id &&
          encerrada.cancelado_por === "passageiro";
        const taxa = canceladaPeloPassageiro ? encerrada.taxa_cancelamento : 0;

        mostrarToast({
          tipo: "warning",
          titulo: canceladaPeloPassageiro
            ? "O passageiro cancelou a corrida"
            : "Corrida encerrada",
          mensagem: canceladaPeloPassageiro
            ? taxa > 0
              ? `Você recebe R$ ${taxa.toFixed(2).replace(".", ",")} de taxa de cancelamento e voltou a receber ofertas.`
              : "Você voltou a receber ofertas."
            : "A corrida não está mais ativa e você voltou a receber ofertas.",
          chave: `corrida:${anterior.id}:encerrada-remotamente`,
        });
      }

      if (nova !== null) setDisponivel(false);

      // Negocia: a corrida chega quando o passageiro escolhe a proposta (no
      // Pix/cartão, depois do pagamento), sem o motorista tocar em aceitar
      if (
        nova !== null &&
        nova.status_corrida === "aceita" &&
        (propostasMandadas.current.has(nova.id) ||
          anterior?.status_corrida === "aguardando_pagamento")
      ) {
        propostasMandadas.current.delete(nova.id);
        mostrarToast({
          tipo: "success",
          titulo: "O passageiro escolheu sua proposta",
          mensagem: "Siga a rota até o ponto de embarque do passageiro.",
          chave: `corrida:${nova.id}:aceita`,
        });
      }

      // o passageiro pode trocar a forma de pagamento uma vez por corrida
      if (
        anterior !== null &&
        nova !== null &&
        anterior.id === nova.id &&
        anterior.metodo_pagamento &&
        nova.metodo_pagamento &&
        anterior.metodo_pagamento !== nova.metodo_pagamento
      ) {
        const rotulo =
          ROTULO_PAGAMENTO[nova.metodo_pagamento] ?? nova.metodo_pagamento;
        mostrarToast({
          tipo: "info",
          titulo: "Pagamento alterado",
          mensagem: `O passageiro trocou para ${rotulo}.`,
          chave: `pagamento:${nova.id}:${nova.metodo_pagamento}`,
        });
      }

      corridaRef.current = nova;
      setCorrida((atual) =>
        JSON.stringify(atual) === JSON.stringify(nova) ? atual : nova,
      );
    },
    [mostrarToast],
  );

  const posicaoAtual = useCallback(async () => {
    let permissao = await Location.getForegroundPermissionsAsync();
    if (permissao.status !== "granted")
      permissao = await Location.requestForegroundPermissionsAsync();

    if (permissao.status !== "granted") return null;

    // o mapa já acompanha o GPS: a leitura recente chega na hora. Pedir uma
    // nova a cada rodada levava ~30 s em aparelho parado.
    const recente = await Location.getLastKnownPositionAsync({
      maxAge: 15_000,
      requiredAccuracy: 100,
    });
    const { coords } =
      recente ??
      (await comTempoLimite(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        20_000,
      ));

    return { latitude: coords.latitude, longitude: coords.longitude };
  }, []);

  const carregarCorridaAtual = useCallback(async () => {
    try {
      const { data } = await api.get<{
        corrida: CorridaEmCurso | null;
        encerrada?: CorridaEncerrada | null;
        chegada: ChegadaEstimada | null;
        passageiro: PassageiroDaCorrida | null;
        espera: ResumoEspera | null;
        alteracao_destino?: PedidoNovoDestino | null;
      }>("/minha-corrida-atual", {
        params: { perfil: "motorista" },
        timeout: 10000,
      });

      aplicarCorrida(data?.corrida ?? null, true, data?.encerrada);
      const pedido =
        data?.alteracao_destino?.status === "pendente"
          ? data.alteracao_destino
          : null;
      setPedidoNovoDestino((anterior) =>
        JSON.stringify(anterior) === JSON.stringify(pedido) ? anterior : pedido,
      );
      setChegada((anterior) =>
        JSON.stringify(anterior) === JSON.stringify(data?.chegada ?? null)
          ? anterior
          : (data?.chegada ?? null),
      );
      setPassageiro((anterior) =>
        JSON.stringify(anterior) === JSON.stringify(data?.passageiro ?? null)
          ? anterior
          : (data?.passageiro ?? null),
      );
      setEspera(data?.espera ?? null);
    } catch {
      // silencioso: é só sincronização de estado
    }
  }, [aplicarCorrida]);

  // o servidor é a fonte da verdade: abrir o app sem isso deixava o motorista
  // recebendo corridas no backend enquanto a tela mostrava "Conectar"
  const sincronizarSituacao = useCallback(async () => {
    try {
      const { data } = await api.get<{
        disponivel: boolean;
        corrida: CorridaEmCurso | null;
        posicao: { latitude: number; longitude: number } | null;
      }>("/motorista/situacao");

      setDisponivel(Boolean(data?.disponivel));
      aplicarCorrida(data?.corrida ?? null);
      if (data?.posicao) setPosicao(data.posicao);
      setPrecisaLiberacao(false);
    } catch (falha) {
      const resposta = (
        falha as {
          response?: { status?: number; data?: { situacao?: string } };
        }
      )?.response;

      if (resposta?.status === 403 && resposta.data?.situacao !== undefined) {
        setPrecisaLiberacao(true);
      }
    }
  }, [aplicarCorrida]);

  useEffect(() => {
    if (pausado) return;

    const sincronizar = async () => {
      await sincronizarSituacao();
      await carregarCorridaAtual();
    };
    const inicio = setTimeout(sincronizar, 0);
    const assinatura = AppState.addEventListener("change", (estado) => {
      const ativo = estado === "active";
      setAppAtivo(ativo);
      if (ativo) void sincronizar();
    });

    return () => {
      clearTimeout(inicio);
      assinatura.remove();
    };
  }, [pausado, sincronizarSituacao, carregarCorridaAtual]);

  const alternarDisponibilidade = useCallback(
    async (novoEstado: boolean) => {
      setOcupado(true);

      try {
        const posicao = novoEstado ? await posicaoAtual() : null;

        if (novoEstado && posicao === null) {
          mostrarToast({
            tipo: "warning",
            titulo: "Localização necessária",
            mensagem: "Permita o acesso ao GPS para receber corridas.",
          });
          return;
        }

        await api.post("/motorista/disponibilidade", {
          disponivel: novoEstado,
          latitude: posicao?.latitude,
          longitude: posicao?.longitude,
        });

        setDisponivel(novoEstado);
        setPosicao(posicao);

        if (!novoEstado) {
          setOferta(null);
          setOfertas([]);
        }

        mostrarToast({
          tipo: "success",
          titulo: novoEstado ? "Você está online" : "Você está offline",
          mensagem: novoEstado
            ? "As corridas próximas já podem aparecer para você."
            : "Novas solicitações foram pausadas.",
          chave: `disponibilidade:${novoEstado}`,
        });
      } catch (falha) {
        mostrarToast({
          tipo: "error",
          titulo: "Não foi possível mudar seu status",
          mensagem: mensagemDoErro(
            falha,
            "Confira sua conexão e tente novamente.",
          ),
        });
      } finally {
        setOcupado(false);
      }
    },
    [mostrarToast, posicaoAtual],
  );

  // "Recusar novas corridas" (tela Mais do 99): ao fim da corrida atual o
  // motorista sai do ar em vez de voltar a receber ofertas. Espera o
  // `ocupado` baixar porque finalizar/cancelar ainda sincronizam a situação
  // com o servidor, e essa resposta (disponível) sobrescreveria o offline.
  const [recusarNovas, setRecusarNovas] = useState(false);
  const recusarNovasRef = useRef(false);
  const idCorridaAnterior = useRef<number | null>(null);
  const corridaEncerrada = useRef(false);

  const alternarRecusarNovas = useCallback(() => {
    const novo = !recusarNovasRef.current;
    recusarNovasRef.current = novo;
    setRecusarNovas(novo);
    mostrarToast({
      tipo: "info",
      titulo: novo ? "Novas corridas recusadas" : "Novas corridas liberadas",
      mensagem: novo
        ? "Você fica offline assim que esta corrida terminar."
        : "Ao terminar esta corrida você continua recebendo ofertas.",
      chave: `recusar-novas:${novo}`,
    });
  }, [mostrarToast]);

  useEffect(() => {
    if (idCorridaAnterior.current !== null && corrida === null) {
      corridaEncerrada.current = true;
    }
    idCorridaAnterior.current = corrida?.id ?? null;

    if (!corridaEncerrada.current || ocupado) return;
    corridaEncerrada.current = false;

    if (!recusarNovasRef.current) return;
    recusarNovasRef.current = false;
    void alternarDisponibilidade(false).then(() => setRecusarNovas(false));
  }, [corrida, ocupado, alternarDisponibilidade]);

  useEffect(() => {
    if (pausado || !appAtivo || !disponivel || corrida !== null) return;

    let cancelado = false;

    let emBusca = false;
    const buscar = async () => {
      if (emBusca) return;
      emBusca = true;
      setCarregandoOfertas(true);
      try {
        const { data } = await api.get<{ corridas: OfertaCorrida[] }>(
          "/motorista/corridas-disponiveis",
          { timeout: 10000 },
        );

        if (cancelado) return;

        const atuais = (data?.corridas ?? []).map((item) => ({
          ...item,
          recusada_localmente: recusadas.current.has(item.corrida_id),
        }));
        // com proposta enviada a chamada não volta a tocar: o motorista só
        // espera a escolha do passageiro (ou faz nova oferta pela lista)
        setOfertas(atuais);
        setOferta(chamadaDaVez(atuais, dispensadas.current));

        // Negocia: a corrida em que ele propôs saiu da lista porque o
        // passageiro escolheu alguém; se foi ele, ela vira a corrida atual
        const decididas = [...propostasMandadas.current].filter(
          (id) => !atuais.some((item) => item.corrida_id === id),
        );
        if (decididas.length > 0) {
          await carregarCorridaAtual();
          decididas.forEach((id) => propostasMandadas.current.delete(id));
        }
      } catch (falha) {
        if (!cancelado) {
          setOferta(null);
          setOfertas([]);
        }

        // 409: o servidor já não o vê disponível (no Negocia, foi escolhido
        // pelo passageiro e a corrida é dele); a tela acompanha o servidor
        // (mesma ordem da abertura do app: situação e depois a corrida inteira)
        if (
          (falha as { response?: { status?: number } })?.response?.status ===
          409
        ) {
          await sincronizarSituacao();
          await carregarCorridaAtual();
        }
      } finally {
        emBusca = false;
        if (!cancelado) setCarregandoOfertas(false);
      }
    };

    const buscaInicial = setTimeout(buscar, 0);

    const relogio = setInterval(
      buscar,
      socketAtivo
        ? INTERVALO_BUSCA_COM_SOCKET_MS
        : INTERVALO_BUSCA_SEM_SOCKET_MS,
    );

    return () => {
      cancelado = true;
      clearTimeout(buscaInicial);
      clearInterval(relogio);
    };
  }, [
    pausado,
    appAtivo,
    disponivel,
    corrida,
    socketAtivo,
    gatilho,
    carregarCorridaAtual,
    sincronizarSituacao,
  ]);

  // WebSocket em cima do polling: avisa que a lista mudou e o hook refaz a
  // consulta (o raio e a autorização seguem no servidor). Sem socket, o
  // intervalo normal de 5s continua valendo.
  useEffect(() => {
    if (pausado || !appAtivo || !disponivel || corrida !== null) {
      return;
    }

    const echo = obterEcho();

    if (echo === null) return;

    try {
      const cancelarObservacao = echo.connector.onConnectionChange((status) => {
        setSocketAtivo(status === "connected");
      });
      const estadoInicial = setTimeout(() => {
        setSocketAtivo(echo.connector.connectionStatus() === "connected");
      }, 0);
      echo
        .private("corridas-disponiveis")
        .listen(".corridas.disponiveis", () => setGatilho((n) => n + 1));

      return () => {
        clearTimeout(estadoInicial);
        cancelarObservacao();
        setSocketAtivo(false);
        try {
          echo.leave("corridas-disponiveis");
        } catch {
          /* canal já encerrado */
        }
      };
    } catch {}
  }, [pausado, appAtivo, disponivel, corrida]);

  const corridaAtivaId = corrida?.id;
  useEffect(() => {
    if (pausado || !appAtivo || (!disponivel && corridaAtivaId === undefined))
      return;

    let cancelado = false;

    let enviando = false;
    const enviarPosicao = async () => {
      if (enviando) return;
      enviando = true;
      try {
        const posicao = await posicaoAtual();

        if (cancelado || posicao === null) return;

        setPosicao((anterior) =>
          anterior?.latitude === posicao.latitude &&
          anterior.longitude === posicao.longitude
            ? anterior
            : posicao,
        );

        try {
          await api.post("/motorista/posicao", posicao);
        } catch {
          // posição é informativa; falhar aqui não pode atrapalhar a corrida
        }
      } catch {
        // GPS indisponível nesta rodada; o próximo intervalo tenta de novo.
      } finally {
        enviando = false;
      }
    };

    // a corrida (previsão e pedido de novo destino) tem relógio próprio: o
    // GPS pode levar dezenas de segundos por leitura, e o pedido do passageiro
    // expira em 2 min
    let recarregando = false;
    const recarregarCorrida = async () => {
      if (recarregando || cancelado || corridaAtivaId === undefined) return;
      recarregando = true;
      try {
        await carregarCorridaAtual();
      } finally {
        recarregando = false;
      }
    };

    enviarPosicao();

    const relogio = setInterval(() => {
      void enviarPosicao();
      void recarregarCorrida();
    }, INTERVALO_POSICAO_MS);

    return () => {
      cancelado = true;
      clearInterval(relogio);
    };
  }, [
    appAtivo,
    pausado,
    disponivel,
    corridaAtivaId,
    posicaoAtual,
    carregarCorridaAtual,
  ]);

  const aceitar = useCallback(
    async (corridaId?: number) => {
      const escolhida =
        corridaId === undefined
          ? oferta
          : (ofertas.find((item) => item.corrida_id === corridaId) ?? null);
      if (escolhida === null) return;

      setOcupado(true);

      try {
        const { data } = await api.post<CorridaEmCurso>(
          `/motorista/corridas/${escolhida.corrida_id}/aceitar`,
        );

        aplicarCorrida(data, false);
        setOferta(null);
        setOfertas([]);
        setDisponivel(false);

        mostrarToast({
          tipo: "success",
          titulo: "Corrida aceita",
          mensagem: "Siga a rota até o ponto de embarque do passageiro.",
          chave: `corrida:${data.id}:aceita`,
        });

        if (posicao === null) {
          const atual = await posicaoAtual();
          if (atual !== null) {
            setPosicao(atual);
            void api.post("/motorista/posicao", atual).catch(() => undefined);
          }
        }

        // a resposta do aceite não traz passageiro nem previsão de chegada
        await carregarCorridaAtual();
      } catch (falha) {
        mostrarToast({
          tipo: "error",
          titulo: "Não foi possível aceitar a corrida",
          mensagem: mensagemDoErro(
            falha,
            "A oferta pode ter sido aceita por outro motorista.",
          ),
        });
        setOferta(null);
        setOfertas((atuais) =>
          atuais.filter((item) => item.corrida_id !== escolhida.corrida_id),
        );
        await sincronizarSituacao();
        await carregarCorridaAtual();
      } finally {
        setOcupado(false);
      }
    },
    [
      oferta,
      ofertas,
      posicao,
      posicaoAtual,
      aplicarCorrida,
      mostrarToast,
      sincronizarSituacao,
      carregarCorridaAtual,
    ],
  );

  const recusar = useCallback(
    (corridaId?: number) => {
      const id = corridaId ?? oferta?.corrida_id;
      if (id !== undefined) {
        recusadas.current.add(id);
        void api
          .post(`/motorista/corridas/${id}/recusar`)
          .catch(() => undefined);
      }

      const atualizadas = ofertas.map((item) =>
        item.corrida_id === id ? { ...item, recusada_localmente: true } : item,
      );
      setOfertas(atualizadas);
      setOferta(chamadaDaVez(atualizadas, dispensadas.current));
      mostrarToast({
        tipo: "info",
        titulo: "Solicitação recusada",
        mensagem: "Essa oferta não será mostrada novamente.",
      });
    },
    [oferta, ofertas, mostrarToast],
  );

  // Negocia: a chamada some sem recusar; a corrida continua na lista
  const dispensarChamada = useCallback(
    (corridaId: number) => {
      dispensadas.current.add(corridaId);
      setOferta(chamadaDaVez(ofertas, dispensadas.current));
    },
    [ofertas],
  );

  const propor = useCallback(
    async (corridaId: number, valorMotorista?: number) => {
      setOcupado(true);

      try {
        const { data } = await api.post<PropostaEnviada>(
          `/motorista/corridas/${corridaId}/propostas`,
          valorMotorista === undefined
            ? {}
            : { valor_motorista: valorMotorista },
        );

        propostasMandadas.current.add(corridaId);
        const atualizadas = ofertas.map((item) =>
          item.corrida_id === corridaId
            ? { ...item, minha_proposta: data }
            : item,
        );
        setOfertas(atualizadas);
        setOferta(chamadaDaVez(atualizadas, dispensadas.current));
      } catch (falha) {
        mostrarToast({
          tipo: "warning",
          titulo: "A proposta não foi enviada",
          mensagem: mensagemDoErro(
            falha,
            "A corrida pode não estar mais recebendo propostas.",
          ),
        });
        // a corrida pode ter saído da negociação; a lista do servidor manda
        recusadas.current.add(corridaId);
        setOferta(null);
        setGatilho((atual) => atual + 1);
      } finally {
        setOcupado(false);
      }
    },
    [ofertas, mostrarToast],
  );

  // proposta do motorista esperando o passageiro escolher (banner na tela)
  const propostaEnviada =
    ofertas.find((item) => item.minha_proposta?.status === "pendente") ?? null;

  const recarregarOfertas = useCallback(
    () => setGatilho((atual) => atual + 1),
    [],
  );

  const avancar = useCallback(
    async (acao: "cheguei" | "iniciar" | "confirmar-parada" | "finalizar") => {
      if (corrida === null) return;

      setOcupado(true);

      try {
        if (acao === "cheguei") {
          const atual = await posicaoAtual();

          if (atual === null) {
            mostrarToast({
              tipo: "warning",
              titulo: "Localização necessária",
              mensagem:
                "Ative o GPS e permita o acesso à localização para informar sua chegada.",
            });
            return;
          }

          setPosicao(atual);
          await api.post("/motorista/posicao", atual);
        }

        const { data } = await api.post<CorridaEmCurso>(
          `/motorista/corridas/${corrida.id}/${acao}`,
        );

        aplicarCorrida(acao === "finalizar" ? null : data, false);

        const proximo =
          acao === "finalizar" ? null : proximoPontoDaCorrida(data);
        const rumo =
          proximo?.tipo === "parada"
            ? "A rota agora segue para a próxima parada."
            : "A rota agora segue para o destino.";

        const avisos = {
          cheguei: {
            titulo: "Chegada informada",
            mensagem: "O passageiro foi avisado que você está no local.",
          },
          iniciar: {
            titulo: "Corrida iniciada",
            mensagem: rumo,
          },
          "confirmar-parada": {
            titulo: "Parada confirmada",
            mensagem: rumo,
          },
          finalizar: {
            titulo: "Corrida finalizada",
            mensagem: recusarNovasRef.current
              ? "Como você pediu, não vai receber novas corridas agora."
              : "Você continua online e pode receber novas ofertas.",
          },
        } as const;
        const aviso = avisos[acao];

        mostrarToast({
          tipo: "success",
          ...aviso,
          chave: `corrida:${corrida.id}:${acao}:${proximo?.paradasPendentes ?? 0}`,
        });

        if (acao === "finalizar") {
          setDisponivel(true);
          setChegada(null);
          setEspera(null);
          setPassageiro(null);
          recusadas.current.clear();
          dispensadas.current.clear();
          setGatilho((atual) => atual + 1);
          await sincronizarSituacao();
        } else {
          await carregarCorridaAtual();
        }
      } catch (falha) {
        mostrarToast({
          tipo: "error",
          titulo: "Não foi possível atualizar a corrida",
          mensagem: mensagemDoErro(
            falha,
            "Confira sua conexão e tente novamente.",
          ),
        });
        await carregarCorridaAtual();
      } finally {
        setOcupado(false);
      }
    },
    [
      corrida,
      posicaoAtual,
      aplicarCorrida,
      mostrarToast,
      carregarCorridaAtual,
      sincronizarSituacao,
    ],
  );

  // canal da própria corrida: pedidos de novo destino e troca de pagamento
  // chegam na hora, sem esperar a próxima rodada de posição (8s)
  useEffect(() => {
    if (pausado || corridaAtivaId === undefined) return;

    const echo = obterEcho();
    if (echo === null) return;

    try {
      echo
        .private(`corrida.${corridaAtivaId}`)
        .listen(".corrida.atualizada", () => void carregarCorridaAtual());

      return () => {
        try {
          echo.leave(`corrida.${corridaAtivaId}`);
        } catch {
          /* canal já encerrado */
        }
      };
    } catch {}
  }, [pausado, corridaAtivaId, carregarCorridaAtual]);

  const responderNovoDestino = useCallback(
    async (aceitar: boolean) => {
      if (corrida === null || pedidoNovoDestino === null) return;

      setRespondendoPedido(true);
      try {
        await api.post(
          `/motorista/corridas/${corrida.id}/destino/${pedidoNovoDestino.id}/${aceitar ? "aceitar" : "recusar"}`,
        );
        setPedidoNovoDestino(null);
        const alvo = pedidoNovoDestino.paradas?.length ? "trajeto" : "destino";
        mostrarToast({
          tipo: aceitar ? "success" : "info",
          titulo: aceitar ? `Novo ${alvo} aceito` : `Novo ${alvo} recusado`,
          mensagem: aceitar
            ? `A rota foi atualizada para o novo ${alvo}.`
            : `A corrida segue no ${alvo} anterior.`,
          chave: `destino:${pedidoNovoDestino.id}:${aceitar ? "aceito" : "recusado"}`,
        });
      } catch (falha) {
        mostrarToast({
          tipo: "warning",
          titulo: "O pedido não vale mais",
          mensagem: mensagemDoErro(
            falha,
            "Confira sua conexão e tente novamente.",
          ),
        });
      } finally {
        await carregarCorridaAtual();
        setRespondendoPedido(false);
      }
    },
    [corrida, pedidoNovoDestino, mostrarToast, carregarCorridaAtual],
  );

  const cancelarNaoComparecimento =
    useCallback(async (): Promise<ResultadoCancelamento> => {
      if (corrida === null || ocupado) {
        return { ok: false, mensagem: "Aguarde a ação anterior terminar." };
      }
      setOcupado(true);
      try {
        const atual = await posicaoAtual();
        if (atual === null) {
          return {
            ok: false,
            mensagem:
              "Ative o GPS e permita o acesso à localização para registrar a ausência.",
          };
        }
        await api.post("/motorista/posicao", atual);
        const { data: cancelada } = await api.post<{
          corrida_financeiro?: { taxa_cancelamento?: number | string | null };
        }>(`/motorista/corridas/${corrida.id}/cancelar`, {
          tipo: "nao_comparecimento",
          motivo: "Passageiro não compareceu ao embarque",
        });
        const taxa = Number(
          cancelada?.corrida_financeiro?.taxa_cancelamento ?? 0,
        );
        aplicarCorrida(null, false);
        setEspera(null);
        setChegada(null);
        setPassageiro(null);
        setDisponivel(true);
        setGatilho((atual) => atual + 1);
        mostrarToast({
          tipo: "info",
          titulo: "Corrida cancelada por ausência",
          mensagem:
            taxa > 0
              ? `Taxa de ausência de R$ ${taxa.toFixed(2).replace(".", ",")} registrada para você.`
              : "Esta categoria não tem taxa de ausência.",
        });
        await sincronizarSituacao();
        return { ok: true };
      } catch (falha) {
        return {
          ok: false,
          mensagem: mensagemDoErro(
            falha,
            "Confira sua localização e tente novamente.",
          ),
        };
      } finally {
        setOcupado(false);
      }
    }, [
      corrida,
      ocupado,
      posicaoAtual,
      aplicarCorrida,
      mostrarToast,
      sincronizarSituacao,
    ]);

  const cancelarCorrida = useCallback(
    async (motivo: string): Promise<ResultadoCancelamento> => {
      if (corrida === null || ocupado || motivo.trim() === "") {
        return { ok: false, mensagem: "Aguarde a ação anterior terminar." };
      }

      setOcupado(true);
      try {
        await api.post(`/motorista/corridas/${corrida.id}/cancelar`, {
          motivo: motivo.trim(),
        });
        aplicarCorrida(null, false);
        setEspera(null);
        setChegada(null);
        setPassageiro(null);
        setOferta(null);
        setOfertas([]);
        setDisponivel(true);
        recusadas.current.clear();
        dispensadas.current.clear();
        setGatilho((atual) => atual + 1);
        await sincronizarSituacao();
        return { ok: true };
      } catch (falha) {
        await carregarCorridaAtual();
        return {
          ok: false,
          mensagem: mensagemDoErro(
            falha,
            "Confira sua conexão e tente novamente.",
          ),
        };
      } finally {
        setOcupado(false);
      }
    },
    [
      corrida,
      ocupado,
      aplicarCorrida,
      sincronizarSituacao,
      carregarCorridaAtual,
    ],
  );

  return {
    disponivel,
    oferta,
    ofertas,
    carregandoOfertas,
    corrida,
    chegada,
    espera,
    passageiro,
    posicao,
    precisaLiberacao,
    ocupado,
    alternarDisponibilidade,
    aceitar,
    recusar,
    dispensarChamada,
    propor,
    propostaEnviada,
    recarregarOfertas,
    avancar,
    cancelarCorrida,
    cancelarNaoComparecimento,
    recusarNovas,
    alternarRecusarNovas,
    pedidoNovoDestino,
    respondendoPedido,
    responderNovoDestino,
  };
}
