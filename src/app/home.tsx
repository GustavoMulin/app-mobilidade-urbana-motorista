// app/home.tsx
// CODEX: 168 linhas adicionadas e 68 removidas no diff atual; integra o simulador local ao fluxo do motorista. Remover após validação/commit.
import AvaliarPassageiro from "@/components/AvaliarPassageiro";
import CorridaEmAndamento from "@/components/CorridaEmAndamento";
import DinheiroRecebido from "@/components/DinheiroRecebido";
import NavegacaoAtiva from "@/components/NavegacaoAtiva";
import PedidoNovoDestino from "@/components/PedidoNovoDestino";
import BotaoEmpilharNegociadas from "@/components/BotaoEmpilharNegociadas";
import {
  AguardandoPagamentoNegocia,
  PropostaEnviadaAviso,
} from "@/components/NegociaMotorista";
import PilhaPropostasNegocia from "@/components/PilhaPropostasNegocia";
import FolhaInferiorMotorista from "@/components/FolhaInferiorMotorista";
import GanhoDiario from "@/components/GanhoDiario";
import Map from "@/components/Map";
import MenuInferiorMotorista from "@/components/MenuInferiorMotorista";
import RecebendoChamada from "@/components/RecebendoChamada";
import SideMenu from "@/components/SideMenu";
import SolicitacoesCorrida from "@/components/SolicitacoesCorrida";
import SolicitarCorrida from "@/components/SolicitarCorrida";
import TopMenu from "@/components/TopMenu";
import { Text } from "@/components/common/Texto";
import SimuladorCorridaMotorista from "@/components/desenvolvimento/SimuladorCorridaMotorista";
import { useAuth } from "@/context/AuthProvider";
import { useAvaliacaoPendente } from "@/hooks/useAvaliacaoPendente";
import {
  type OfertaCorrida,
  useDespachoMotorista,
} from "@/hooks/useDespachoMotorista";
import { useEmpilharNegociadas } from "@/hooks/useEmpilharNegociadas";
import { useRotaDaCorrida } from "@/hooks/useRotaDaCorrida";
import { useRotaDaOferta } from "@/hooks/useRotaDaOferta";
import { ehMinha, useChatDaCorrida } from "@/hooks/useChatDaCorrida";
import AvisosDoChat from "@/components/AvisosDoChat";
import { ouvirToqueNoChat } from "@/Services/push";
import ChatDaCorrida from "@/components/ChatDaCorrida";
import OfertaNegociaMotorista from "@/components/OfertaNegociaMotorista";
import { useSimuladorCorridaMotorista } from "@/hooks/useSimuladorCorridaMotorista";
import { proximoPontoDaCorrida } from "@/domain/rotaDaCorrida";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import { Region } from "react-native-maps";
import { useSharedValue } from "react-native-reanimated";

// altura aproximada da folha de corrida, pra rota não ser enquadrada atrás dela
const ALTURA_FOLHA_CORRIDA = 330;
const ALTURA_FOLHA_ESPERA = 340;

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [destinationModalVisible, setDestinationModalVisible] = useState(false);
  const [solicitacoesCorrida, setSolicitacoesCorrida] = useState(false);
  const simuladorCorrida = useSimuladorCorridaMotorista();
  const { empilhar, alternar: alternarEmpilhar } = useEmpilharNegociadas();
  const {
    disponivel,
    oferta,
    ofertas,
    carregandoOfertas,
    corrida,
    chegada,
    espera,
    passageiro,
    grupo,
    posicao,
    precisaLiberacao,
    ocupado,
    alternarDisponibilidade,
    aceitar,
    recusar,
    dispensarChamada,
    propor,
    propostasPendentes,
    recarregarOfertas,
    avancar,
    cancelarCorrida,
    cancelarNaoComparecimento,
    recusarNovas,
    alternarRecusarNovas,
    pedidoNovoDestino,
    respondendoPedido,
    responderNovoDestino,
    ganhoRecebido,
    fecharGanhoRecebido,
  } = useDespachoMotorista(simuladorCorrida.ativa);

  const dadosSimulados = simuladorCorrida.dados;
  const corridaExibida = simuladorCorrida.ativa
    ? (dadosSimulados?.corrida ?? null)
    : corrida;
  const ofertaExibida = simuladorCorrida.ativa
    ? (dadosSimulados?.oferta ?? null)
    : oferta;
  const chegadaExibida = simuladorCorrida.ativa
    ? (dadosSimulados?.chegada ?? null)
    : chegada;
  const esperaExibida = simuladorCorrida.ativa
    ? (dadosSimulados?.espera ?? null)
    : espera;
  const passageiroExibido = simuladorCorrida.ativa
    ? (dadosSimulados?.passageiro ?? null)
    : passageiro;
  const posicaoExibida = simuladorCorrida.ativa
    ? (dadosSimulados?.posicao ?? null)
    : posicao;
  const regiaoSimulada =
    simuladorCorrida.ativa && posicaoExibida
      ? {
          ...posicaoExibida,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : null;
  const ocupadoExibido = simuladorCorrida.ativa ? false : ocupado;
  // a chamada que está tocando: o mapa mostra o trajeto dela acima do card
  const chamadaNoMapa = ofertaExibida !== null && corridaExibida === null;
  const { rota: rotaDaOferta, pontos: pontosDaOferta } = useRotaDaOferta(
    chamadaNoMapa && !simuladorCorrida.ativa ? ofertaExibida : null,
  );
  const [alturaDaChamada, setAlturaDaChamada] = useState(0);
  // no embarque, a altura medida da folha com as mensagens rápidas
  const [alturaDaEspera, setAlturaDaEspera] = useState(ALTURA_FOLHA_ESPERA);
  // Negocia: o lápis do card abre o valor livre (fica aberto mesmo se a
  // chamada sumir; a corrida continua na lista de Solicitações)
  const [valorLivre, setValorLivre] = useState<OfertaCorrida | null>(null);
  // empilhar desligado: o card amarelo de antes no rodapé (sem chamada na
  // frente); os botões do mapa sobem para não ficarem atrás dele
  const avisoNoRodape =
    !simuladorCorrida.ativa &&
    !empilhar &&
    corridaExibida === null &&
    ofertaExibida === null &&
    propostasPendentes.length > 0;
  const [alturaDoAviso, setAlturaDoAviso] = useState(0);
  // conversa com o passageiro da corrida atual (backend: ChatCorridaController)
  const [chatAberto, setChatAberto] = useState(false);
  // altura do cartão do topo da navegação: os avisos do chat ficam logo abaixo
  const [alturaDoTopo, setAlturaDoTopo] = useState(160);
  const chat = useChatDaCorrida(
    simuladorCorrida.ativa ? null : (corridaExibida?.id ?? null),
    chatAberto,
  );
  const abrirChat = () => {
    chat.marcarLidas();
    setChatAberto(true);
  };
  // tocar no push de uma mensagem abre a conversa quando a corrida carregar
  const [chatPedidoPeloPush, setChatPedidoPeloPush] = useState<{
    corridaId: number;
    vez: number;
  } | null>(null);
  const pedidoAtendido = useRef(0);
  const abrirChatRef = useRef(abrirChat);
  useEffect(() => {
    abrirChatRef.current = abrirChat;
  });
  useEffect(
    () =>
      ouvirToqueNoChat((corridaId) =>
        setChatPedidoPeloPush((atual) => ({
          corridaId,
          vez: (atual?.vez ?? 0) + 1,
        })),
      ),
    [],
  );
  useEffect(() => {
    if (
      !chatPedidoPeloPush ||
      chatPedidoPeloPush.vez === pedidoAtendido.current
    )
      return;
    if (corridaExibida?.id !== chatPedidoPeloPush.corridaId) return;
    pedidoAtendido.current = chatPedidoPeloPush.vez;
    abrirChatRef.current();
  }, [chatPedidoPeloPush, corridaExibida?.id]);
  const mensagensEnviadas = useMemo(
    () => chat.mensagens.filter(ehMinha).map((item) => item.conteudo),
    [chat.mensagens],
  );
  const disponivelExibido = simuladorCorrida.ativa ? false : disponivel;

  // a lista de solicitações fecha quando uma corrida começa; sem isso ela
  // continuava "aberta" por baixo e voltava à tela quando a corrida acabava
  useEffect(() => {
    if (corridaExibida === null) return;
    const fechar = setTimeout(() => setSolicitacoesCorrida(false), 0);
    return () => clearTimeout(fechar);
  }, [corridaExibida]);

  const statusNavegacao =
    corridaExibida?.status_corrida === "aceita" ||
    corridaExibida?.status_corrida === "em_andamento"
      ? corridaExibida.status_corrida
      : null;
  const statusComNavegacao = statusNavegacao !== null;
  // no embarque a tela é a do 99: pílula do endereço no topo no lugar do
  // menu e do atalho de ganhos
  const esperandoNoEmbarque =
    corridaExibida?.status_corrida === "motorista_chegou";
  // esperando o pagamento do Negocia a tela tem o mesmo formato
  const telaDeEspera =
    esperandoNoEmbarque ||
    corridaExibida?.status_corrida === "aguardando_pagamento";
  const embarqueDaCorrida =
    corridaExibida?.corrida_destinos?.find((ponto) => ponto.tipo === "origem")
      ?.endereco ?? null;
  const proximoPonto = proximoPontoDaCorrida(corridaExibida);
  const { rota: rotaDaCorrida, alvo: alvoDaCorrida } = useRotaDaCorrida(
    statusComNavegacao || simuladorCorrida.ativa ? null : corridaExibida,
    simuladorCorrida.ativa ? null : posicaoExibida,
  );

  const {
    corrida: corridaParaAvaliar,
    enviando: enviandoAvaliacao,
    avaliar,
    dispensar: dispensarAvaliacao,
  } = useAvaliacaoPendente(corrida?.id ?? null);
  const encerrarSimulacao = simuladorCorrida.encerrar;

  useEffect(() => {
    if (simuladorCorrida.ativa && (corrida !== null || oferta !== null)) {
      encerrarSimulacao();
    }
  }, [corrida, oferta, simuladorCorrida.ativa, encerrarSimulacao]);

  // ✨ NOVO ESTADO: Armazena a região inicial do usuário (sem o ajuste de offset)
  const userInitialRegion = useRef<Region | null>(null);

  // ✨ NOVO: Estado para armazenar o índice do BottomSheet
  const [bottomSheetIndex, setBottomSheetIndex] = useState<number>(0);
  const [alturaMenuInferior, setAlturaMenuInferior] = useState(0);
  const bottomSheetAnimatedIndex = useSharedValue(0);

  // ✨ NOVO: Estado do modal de ganhos foi elevado para cá
  const [ganhoModalVisivel, setGanhoModalVisivel] = useState(false);

  const drawerWidth = Math.round(Dimensions.get("window").width * 0.78);
  const [translateX] = useState(() => new Animated.Value(-drawerWidth));

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: menuVisible ? 0 : -drawerWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuVisible, drawerWidth, translateX]);

  // 🔹 Função para fechar o menu
  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  // ✨ NOVA FUNÇÃO: Coordena abertura do menu e fechamento do modal
  const handleMenuOpen = () => {
    if (ganhoModalVisivel) {
      // Pequeno delay para deixar a animação do modal acontecer antes do SideMenu
      setMenuVisible(true);
      setGanhoModalVisivel(false);
      // setTimeout(() => setGanhoModalVisivel(false), 500); // mesmo tempo da animação
      return;
    }
    setMenuVisible(true);
  };

  // 🔹 Redirecionar para login se não estiver autenticado
  // cadastro ainda em análise não opera: volta para a esteira de liberação
  useEffect(() => {
    if (precisaLiberacao) {
      router.replace("/liberacao");
    }
  }, [precisaLiberacao, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const handleUserLocationFound = useCallback((userRegion: Region) => {
    userInitialRegion.current = {
      ...userRegion,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    const adjustedRegion: Region = {
      ...userRegion,
      latitude: userRegion.latitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(adjustedRegion);
  }, []);

  const onChangeBottomSheetMotorista = useCallback((index: number) => {
    setBottomSheetIndex(index);
    if (!userInitialRegion.current) {
      return;
    }
  }, []);

  // 🔹 Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Verificando autenticação...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* <StatusBar style={colorScheme === "dark" ? "light" : "dark"} /> */}

      {/* 🔹 Mapa com ajuste de posicionamento */}
      {!statusComNavegacao && (
        <Map
          region={regiaoSimulada ?? region}
          onRegionChange={simuladorCorrida.ativa ? () => undefined : setRegion}
          onUserLocationFound={
            simuladorCorrida.ativa ? undefined : handleUserLocationFound
          }
          bottomSheetIndex={bottomSheetIndex}
          indiceFolhaAnimado={bottomSheetAnimatedIndex}
          alturaMinimaRodape={
            corridaExibida === null
              ? alturaMenuInferior + (avisoNoRodape ? alturaDoAviso + 12 : 0)
              : 0
          }
          isGanhoModalVisible={ganhoModalVisivel}
          // já no embarque não há o que traçar: a rota de poucos metros
          // dava a volta no quarteirão por causa da mão da rua
          rota={
            chamadaNoMapa
              ? rotaDaOferta
              : corridaExibida?.status_corrida === "motorista_chegou"
                ? []
                : rotaDaCorrida
          }
          alvo={chamadaNoMapa ? null : alvoDaCorrida}
          alvoEhDestino={false}
          marcadores={chamadaNoMapa ? pontosDaOferta : []}
          alturaFolha={
            telaDeEspera
              ? alturaDaEspera
              : chamadaNoMapa
                ? alturaDaChamada
                : corridaExibida === null
                  ? 0
                  : ALTURA_FOLHA_CORRIDA
          }
          botaoAcima={
            corridaExibida === null && !chamadaNoMapa ? (
              <BotaoEmpilharNegociadas
                ativo={empilhar}
                onAlternar={alternarEmpilhar}
              />
            ) : undefined
          }
        />
      )}

      {corridaExibida !== null && statusNavegacao !== null && (
        <NavegacaoAtiva
          status={statusNavegacao}
          codigoCorrida={corridaExibida.codigo_corrida}
          alvo={proximoPonto?.coordenada ?? null}
          enderecoAlvo={proximoPonto?.endereco}
          tipoAlvo={proximoPonto?.tipo}
          totalParadas={proximoPonto?.totalParadas}
          paradasPendentes={proximoPonto?.paradasPendentes}
          categoria={
            grupo && !simuladorCorrida.ativa
              ? "Compartilhada"
              : (corridaExibida.produto?.nome ?? null)
          }
          recusarNovas={recusarNovas}
          onAlternarRecusarNovas={
            simuladorCorrida.ativa ? () => undefined : alternarRecusarNovas
          }
          passageiro={passageiroExibido}
          origem={
            corridaExibida.corrida_destinos?.find(
              (destino) => destino.tipo === "origem",
            )?.endereco
          }
          destino={
            corridaExibida.corrida_destinos?.find(
              (destino) => destino.tipo === "destino",
            )?.endereco
          }
          metodoPagamento={
            corridaExibida.corrida_financeiro?.metodo_pagamento ?? null
          }
          minutos={chegadaExibida?.minutos ?? null}
          distanciaKm={chegadaExibida?.distancia_km ?? null}
          ocupado={ocupadoExibido}
          posicaoSimulada={simuladorCorrida.ativa ? posicaoExibida : null}
          rotaSimulada={
            simuladorCorrida.ativa
              ? (dadosSimulados?.rotaNavegacao ?? null)
              : null
          }
          onAvancar={
            simuladorCorrida.ativa ? simuladorCorrida.avancar : avancar
          }
          onCancelar={
            simuladorCorrida.ativa ? simuladorCorrida.cancelar : cancelarCorrida
          }
          chatNaoLidas={chat.naoLidas}
          onAbrirChat={simuladorCorrida.ativa ? undefined : abrirChat}
          paradasDoGrupo={simuladorCorrida.ativa ? null : grupo?.paradas}
          onAlturaDoTopo={setAlturaDoTopo}
        />
      )}

      {corridaExibida?.status_corrida === "motorista_chegou" && (
        <CorridaEmAndamento
          origem={
            corridaExibida.corrida_destinos?.find((d) => d.tipo === "origem")
              ?.endereco
          }
          destino={
            corridaExibida.corrida_destinos?.find((d) => d.tipo === "destino")
              ?.endereco
          }
          categoria={corridaExibida.produto?.nome ?? null}
          passageiro={passageiroExibido}
          ocupado={ocupadoExibido}
          espera={esperaExibida}
          recusarNovas={recusarNovas}
          onAvancar={
            simuladorCorrida.ativa ? simuladorCorrida.avancar : avancar
          }
          onCancelar={
            simuladorCorrida.ativa ? simuladorCorrida.cancelar : cancelarCorrida
          }
          onCancelarNaoComparecimento={
            simuladorCorrida.ativa
              ? simuladorCorrida.cancelar
              : cancelarNaoComparecimento
          }
          onAlternarRecusarNovas={
            simuladorCorrida.ativa ? () => undefined : alternarRecusarNovas
          }
          chatNaoLidas={chat.naoLidas}
          onAbrirChat={simuladorCorrida.ativa ? undefined : abrirChat}
          mensagensEnviadas={mensagensEnviadas}
          onEnviarMensagem={
            simuladorCorrida.ativa || !chat.podeEnviar ? undefined : chat.enviar
          }
          onAlturaDoTopo={setAlturaDoTopo}
          onAlturaChange={setAlturaDaEspera}
          esperaMinimaAusenciaS={
            grupo && !simuladorCorrida.ativa
              ? grupo.espera_embarque_segundos
              : undefined
          }
          rotuloIniciar={
            grupo && !simuladorCorrida.ativa
              ? `${passageiroExibido?.nome ?? "Passageiro"} embarcou`
              : undefined
          }
          paradasDoGrupo={simuladorCorrida.ativa ? null : grupo?.paradas}
        />
      )}

      {/* com uma chamada tocando, a avaliação sai da frente e volta depois */}
      {corridaParaAvaliar !== null &&
        corridaExibida === null &&
        ofertaExibida === null &&
        !simuladorCorrida.finalizada && (
          <AvaliarPassageiro
            corrida={corridaParaAvaliar}
            enviando={enviandoAvaliacao}
            onAvaliar={avaliar}
            onDispensar={dispensarAvaliacao}
          />
        )}

      {ganhoRecebido !== null && (
        <DinheiroRecebido
          key={ganhoRecebido.corridaId}
          valor={ganhoRecebido.valor}
          onFim={fecharGanhoRecebido}
        />
      )}

      {/* Negocia: propostas esperando o passageiro, no topo; a chamada da vez
          continua chegando embaixo */}
      {!simuladorCorrida.ativa &&
        empilhar &&
        corridaExibida === null &&
        propostasPendentes.length > 0 && (
          <PilhaPropostasNegocia
            propostas={propostasPendentes}
            chamadaNaTela={ofertaExibida !== null}
          />
        )}

      {avisoNoRodape && (
        <PropostaEnviadaAviso
          valorMotorista={
            propostasPendentes[0].minha_proposta?.valor_motorista ?? null
          }
          expiraEm={propostasPendentes[0].minha_proposta?.expira_em ?? null}
          outras={propostasPendentes.length - 1}
          distanciaDoRodape={alturaMenuInferior}
          onAlturaChange={setAlturaDoAviso}
        />
      )}

      {ofertaExibida !== null && corridaExibida === null && (
        <RecebendoChamada
          key={ofertaExibida.corrida_id}
          valor={ofertaExibida.valor_motorista}
          distanciaAteOrigem={ofertaExibida.distancia_ate_origem_km}
          distanciaDaCorrida={ofertaExibida.distancia_corrida_km}
          origem={ofertaExibida.origem}
          destino={ofertaExibida.destino}
          paradas={ofertaExibida.paradas}
          paraOutraPessoa={ofertaExibida.para_outra_pessoa}
          categoria={ofertaExibida.categoria}
          metodoPagamento={ofertaExibida.metodo_pagamento}
          negociavel={
            !simuladorCorrida.ativa && ofertaExibida.negociavel === true
          }
          onPropor={(valorMotorista) =>
            void propor(ofertaExibida.corrida_id, valorMotorista)
          }
          onExpirar={
            !simuladorCorrida.ativa && ofertaExibida.negociavel === true
              ? () => dispensarChamada(ofertaExibida.corrida_id)
              : undefined
          }
          notaPassageiro={ofertaExibida.passageiro_nota}
          corridasPassageiro={ofertaExibida.passageiro_corridas}
          compartilhada={ofertaExibida.compartilhada}
          onAceitar={
            simuladorCorrida.ativa ? simuladorCorrida.aceitar : aceitar
          }
          onRecusar={
            simuladorCorrida.ativa ? simuladorCorrida.encerrar : recusar
          }
          onEditarValor={
            !simuladorCorrida.ativa && ofertaExibida.negociavel === true
              ? () => setValorLivre(ofertaExibida)
              : undefined
          }
          onAlturaChange={setAlturaDaChamada}
        />
      )}

      {!chatAberto && corridaExibida !== null && (
        <AvisosDoChat
          corridaId={chat.corridaId}
          recebidas={chat.recebidasNaoLidas}
          carregada={chat.carregada}
          onAbrir={abrirChat}
          // logo abaixo da pílula do embarque ou do cartão de manobra
          distanciaDoTopo={alturaDoTopo + 10}
        />
      )}

      <ChatDaCorrida
        visible={chatAberto && corridaExibida !== null}
        onClose={() => {
          chat.marcarLidas();
          setChatAberto(false);
        }}
        nomeDoOutro={passageiroExibido?.nome ?? "Passageiro"}
        mensagens={chat.mensagens}
        podeEnviar={chat.podeEnviar}
        onEnviar={(texto) => void chat.enviar(texto)}
        onReenviar={(mensagem) => void chat.reenviar(mensagem)}
        etapa={corridaExibida?.status_corrida}
      />

      <OfertaNegociaMotorista
        oferta={valorLivre}
        ocupado={ocupadoExibido}
        onClose={() => setValorLivre(null)}
        onConfirmar={async (corridaId, valorMotorista) => {
          setValorLivre(null);
          await propor(corridaId, valorMotorista);
        }}
      />

      <GanhoDiario
        visible={ganhoModalVisivel}
        setVisible={setGanhoModalVisivel}
        corridaAtivaId={corridaExibida?.id ?? null}
        ocultarAtalho={telaDeEspera || chamadaNoMapa}
      />
      {/* com a chamada na tela o topo fica livre, como no 99 */}
      {!statusComNavegacao && !telaDeEspera && !chamadaNoMapa && (
        <TopMenu onMenuPress={handleMenuOpen} />
      )}

      {/* Backdrop para SideMenu */}
      {menuVisible && (
        <Pressable
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
        />
      )}

      {/* Side Menu - zIndex menor */}
      <SideMenu
        visible={menuVisible}
        onClose={closeMenu}
        drawerWidth={280}
        disponivel={disponivelExibido}
        emCorrida={corridaExibida !== null}
        onAlternarDisponibilidade={alternarDisponibilidade}
      />

      {/* FolhaInferior */}
      {ofertaExibida === null && corridaExibida === null && (
        <>
          {menuVisible && (
            <Pressable
              style={styles.backdrop}
              onPress={() => setMenuVisible(false)}
            />
          )}

          <FolhaInferiorMotorista
            onSheetChange={onChangeBottomSheetMotorista}
            indiceAnimado={bottomSheetAnimatedIndex}
          />

          <SolicitarCorrida
            visible={destinationModalVisible}
            onClose={() => setDestinationModalVisible(false)}
          />

          <SolicitacoesCorrida
            visible={solicitacoesCorrida}
            onClose={() => setSolicitacoesCorrida(false)}
            disponivel={disponivelExibido}
            carregando={carregandoOfertas}
            ofertas={ofertas}
            ocupado={ocupadoExibido}
            onAtualizar={recarregarOfertas}
            onAceitar={(corridaId) => {
              setSolicitacoesCorrida(false);
              void aceitar(corridaId);
            }}
            onPropor={(corridaId, valorMotorista) =>
              propor(corridaId, valorMotorista)
            }
            onRecusar={(corridaId) => recusar(corridaId)}
          />

          <MenuInferiorMotorista
            setSolicitacoesCorrida={() => setSolicitacoesCorrida(true)}
            disponivel={disponivelExibido}
            emCorrida={corridaExibida !== null}
            ocupado={ocupadoExibido}
            onAlternarDisponibilidade={alternarDisponibilidade}
            onAlturaChange={setAlturaMenuInferior}
          />
        </>
      )}

      {corridaExibida?.status_corrida === "aguardando_pagamento" && (
        <AguardandoPagamentoNegocia
          valorMotorista={corridaExibida.corrida_financeiro?.valor_motorista}
          metodoPagamento={corridaExibida.metodo_pagamento}
          origem={
            corridaExibida.corrida_destinos?.find((d) => d.tipo === "origem")
              ?.endereco
          }
          passageiro={passageiroExibido}
          aceitaEm={corridaExibida.tempo_aceite}
          pagamentoExpiraEm={corridaExibida.pagamento_expira_em}
        />
      )}

      <PedidoNovoDestino
        pedido={simuladorCorrida.ativa ? null : pedidoNovoDestino}
        origem={embarqueDaCorrida}
        paradasFeitas={
          corridaExibida?.corrida_destinos?.filter(
            (ponto) => ponto.tipo === "parada" && ponto.concluida_em,
          ).length ?? 0
        }
        respondendo={respondendoPedido}
        onResponder={(aceitar) => void responderNovoDestino(aceitar)}
      />

      <SimuladorCorridaMotorista
        ativa={simuladorCorrida.ativa}
        etapa={simuladorCorrida.etapa}
        finalizada={simuladorCorrida.finalizada}
        bloqueado={corrida !== null || oferta !== null}
        onIniciar={simuladorCorrida.iniciar}
        onSelecionarEtapa={simuladorCorrida.selecionarEtapa}
        onFinalizar={simuladorCorrida.finalizar}
        onEncerrar={simuladorCorrida.encerrar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.28)",
    zIndex: 18, // zIndex para o backdrop do SideMenu
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
});
