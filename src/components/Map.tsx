// CODEX: contagem pendente; recupera carregamento e limita enquadramento à área visível. Remover após validação/commit.
import { useCarregamentoMapa } from "@/hooks/useCarregamentoMapa";
import { paddingMapa, pontoMapaValido } from "@/domain/visualizacaoMapa";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "@/components/common/Texto";
import MarcadorMinhaLocalizacao from "@/components/MarcadorMinhaLocalizacao";
import {
  classificarFalhaLocalizacao,
  comTempoLimite,
} from "@/domain/localizacao";
import {
  AppState,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface Coordenada {
  latitude: number;
  longitude: number;
}

interface MapProps {
  region: Region | null;
  onRegionChange: (region: Region) => void;
  onUserLocationFound?: (region: Region) => void;
  bottomSheetIndex?: number; // 👈 nova prop
  indiceFolhaAnimado?: SharedValue<number>;
  isGanhoModalVisible?: boolean;
  rota?: Coordenada[];
  alvo?: Coordenada | null;
  alvoEhDestino?: boolean;
  // altura ocupada pela folha da corrida, pra rota não ficar embaixo dela
  alturaFolha?: number;
  // altura de um painel fixo no rodapé (ex.: "Buscando"), que fica por cima
  // da folha arrastável quando ela está recolhida
  alturaMinimaRodape?: number;
}

// Sem posição ainda e sem cache, mostra o país inteiro em vez de 0,0 (que é
// oceano): o mapa aparece na hora e se ajusta quando a posição chegar.
const REGIAO_BRASIL: Region = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 35,
  longitudeDelta: 35,
};

const CHAVE_ULTIMA_REGIAO = "@motorista_ultima_regiao";
const LIMITE_POSICAO_MS = 15_000;

const regiaoDaPosicao = (coords: {
  latitude: number;
  longitude: number;
}): Region => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
});

type Permissao = "verificando" | "concedida" | "negada";

export default function Map({
  region,
  onRegionChange,
  onUserLocationFound,
  bottomSheetIndex, // 👈 recebendo o valor
  indiceFolhaAnimado,
  isGanhoModalVisible,
  rota = [],
  alvo = null,
  alvoEhDestino = false,
  alturaFolha = 0,
  alturaMinimaRodape = 0,
}: MapProps) {
  const { height: alturaTela } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [permissao, setPermissao] = useState<Permissao>("verificando");
  const [buscandoPosicao, setBuscandoPosicao] = useState(false);
  const [localizacaoIndisponivel, setLocalizacaoIndisponivel] = useState(false);
  const [regiaoReserva, setRegiaoReserva] = useState<Region>(REGIAO_BRASIL);
  const temPosicaoReal = useRef(false);
  const {
    pronto: mapReady, tentativa: mapaTentativa, demorando: mapaDemorando,
    aoPronto: mapaPronto, aoCarregar: mapaCarregado, dispensar: dispensarAvisoMapa,
    tentarNovamente: recarregarMapa,
  } = useCarregamentoMapa();
  const [dimensoesMapa, setDimensoesMapa] = useState({ width: 0, height: 0 });
  const [tentativaLocalizacao, setTentativaLocalizacao] = useState(0);

  const estiloPosicaoCentralizar = useAnimatedStyle(() => {
    const indice = indiceFolhaAnimado?.value ?? bottomSheetIndex ?? 0;
    const folgaDaFolha = interpolate(
      indice,
      [0, 1, 2],
      [16, 40, 40],
      Extrapolation.CLAMP,
    );
    const alturaOcupada =
      alturaFolha > 0
        ? alturaFolha
        : Math.max(
            interpolate(
              indice,
              [0, 1, 2],
              [alturaTela * 0.18, alturaTela * 0.52, alturaTela * 0.92],
              Extrapolation.CLAMP,
            ),
            alturaMinimaRodape,
          );

    return {
      bottom: Math.min(
        alturaOcupada + (alturaFolha > 0 ? 16 : folgaDaFolha),
        alturaTela - 64,
      ),
      opacity:
        alturaFolha > 0
          ? 1
          : interpolate(indice, [0, 1.7, 2], [1, 1, 0], Extrapolation.CLAMP),
    };
  }, [alturaFolha, alturaMinimaRodape, alturaTela, bottomSheetIndex, indiceFolhaAnimado]);

  // 🔹 guarda a região original do usuário para aplicar offsets conforme o BottomSheet
  const userInitialRegion = useRef<Region | null>(null);

  // com rota na tela, o mapa deixa de seguir a região manual e passa a
  // mostrar o trajeto inteiro
  const chaveRota =
    rota.length > 0
      ? `${rota.length}:${rota[0].latitude},${rota[0].longitude}:${rota[rota.length - 1].latitude},${rota[rota.length - 1].longitude}`
      : "";

  // Contorno do react-native-maps no Android (nova arquitetura, issue
  // react-native-maps#5840): desmontar a Polyline às vezes deixa a linha
  // desenhada no mapa nativo. Quando a rota some (chegou no embarque,
  // corrida acabou), remonta o mapa para limpá-la.
  const rotaAnterior = useRef("");
  useEffect(() => {
    const tinhaRota = rotaAnterior.current !== "";
    rotaAnterior.current = chaveRota;
    if (tinhaRota && chaveRota === "") recarregarMapa();
  }, [chaveRota, recarregarMapa]);

  useEffect(() => {
    if (chaveRota === "" || !mapReady || mapRef.current === null) return;

    if (dimensoesMapa.width <= 0 || dimensoesMapa.height <= 0) return;
    const pontosValidos = rota.filter(pontoMapaValido);
    if (pontosValidos.length < 2) return;
    mapRef.current.fitToCoordinates(pontosValidos, {
      edgePadding: paddingMapa(dimensoesMapa.width, dimensoesMapa.height, insets.top + 100, Math.max(alturaFolha, 120) + 16),
      animated: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveRota, alturaFolha, mapReady, dimensoesMapa.width, dimensoesMapa.height, insets.top]);

  useEffect(() => {
    void AsyncStorage.getItem(CHAVE_ULTIMA_REGIAO)
      .then((salva) => {
        if (salva && !temPosicaoReal.current) {
          const ponto = JSON.parse(salva);
          if (pontoMapaValido(ponto)) setRegiaoReserva(regiaoDaPosicao(ponto));
        }
      })
      .catch(() => {});
  }, []);

  // A posição do motorista vem apenas do expo-location. Evitar o listener
  // nativo do mapa impede o evento topUserLocationChange incompatível com
  // React Fabric em parte dos Androids.
  const registrarPosicao = useCallback(
    (coords: { latitude: number; longitude: number }) => {
      if (!pontoMapaValido(coords)) return;
      const regiao = regiaoDaPosicao(coords);
      userInitialRegion.current = regiao;
      setUserLocation(regiao);
      setLocalizacaoIndisponivel(false);

      if (temPosicaoReal.current) return;
      temPosicaoReal.current = true;
      onUserLocationFound?.(regiao);
      void AsyncStorage.setItem(CHAVE_ULTIMA_REGIAO, JSON.stringify(regiao));
    },
    [onUserLocationFound],
  );

  const obterPosicaoAtual = useCallback(async () => {
    const recente = await Location.getLastKnownPositionAsync({
      maxAge: 60_000,
      requiredAccuracy: 500,
    });

    return (
      recente ??
      (await comTempoLimite(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        LIMITE_POSICAO_MS,
      ))
    );
  }, []);

  useEffect(() => {
    let montado = true;
    let assinatura: Location.LocationSubscription | null = null;

    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (!montado) return;

        if (status !== "granted") {
          setPermissao("negada");
          return;
        }

        setPermissao("concedida");
        setBuscandoPosicao(true);
        const posicao = await obterPosicaoAtual();
        if (montado) registrarPosicao(posicao.coords);

        assinatura = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 8_000,
            distanceInterval: 20,
          },
          (novaPosicao) => {
            if (montado) registrarPosicao(novaPosicao.coords);
          },
        );
      } catch (erro) {
        if (!montado || temPosicaoReal.current) return;

        if (classificarFalhaLocalizacao(erro) === "sem_permissao") {
          setPermissao("negada");
        } else {
          setLocalizacaoIndisponivel(true);
        }
      } finally {
        if (montado) setBuscandoPosicao(false);
      }
    })();

    return () => {
      montado = false;
      assinatura?.remove();
    };
  }, [obterPosicaoAtual, registrarPosicao, tentativaLocalizacao]);

  // volta das configurações do Android: se o GPS ou a permissão foram
  // ativados lá, tenta de novo sem o motorista precisar tocar em nada
  useEffect(() => {
    const assinatura = AppState.addEventListener("change", async (estado) => {
      if (estado !== "active") return;
      if (permissao === "concedida" && !localizacaoIndisponivel) return;

      const atual = await Location.getForegroundPermissionsAsync();
      if (atual.status === "granted") {
        setTentativaLocalizacao((tentativa) => tentativa + 1);
      }
    });
    return () => assinatura.remove();
  }, [permissao, localizacaoIndisponivel]);

  const ativarLocalizacao = async () => {
    if (Platform.OS === "android") {
      // abre o diálogo do sistema "Ativar localização" sem sair do app
      await Location.enableNetworkProviderAsync().catch(() => {});
    }
    setTentativaLocalizacao((atual) => atual + 1);
  };

  const centerOnUser = async () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
      return;
    }

    try {
      setBuscandoPosicao(true);
      const posicao = await obterPosicaoAtual();
      registrarPosicao(posicao.coords);
      mapRef.current?.animateToRegion(regiaoDaPosicao(posicao.coords), 1000);
    } catch (erro) {
      if (classificarFalhaLocalizacao(erro) === "sem_permissao") {
        setPermissao("negada");
      } else {
        setLocalizacaoIndisponivel(true);
      }
    } finally {
      setBuscandoPosicao(false);
    }
  };

  // 👇 NOVO useEffect: reage à mudança de estado do BottomSheet
  useEffect(() => {
    if (
      bottomSheetIndex === undefined ||
      !userInitialRegion.current ||
      rota.length > 1
    )
      return;

    const fracaoOcupada = [0.18, 0.52, 0.92][bottomSheetIndex] ?? 0.18;
    const base = userInitialRegion.current;
    const latitudeDelta = base.latitudeDelta ?? 0.01;
    const novaRegiao: Region = {
      ...base,
      latitude: base.latitude - (latitudeDelta * fracaoOcupada) / 2,
      latitudeDelta,
      longitudeDelta: base.longitudeDelta ?? 0.01,
    };

    mapRef.current?.animateToRegion(novaRegiao, 450);
  }, [bottomSheetIndex, rota.length, mapReady]);

  const pedirPermissao = () => {
    void Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        setTentativaLocalizacao((atual) => atual + 1);
      } else {
        void Linking.openSettings();
      }
    });
  };

  return (
    <View collapsable={false} style={[StyleSheet.absoluteFill, styles.mapContainer]}>
      <MapView
        key={mapaTentativa}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        region={
          rota.length > 0 ? undefined : region || userLocation || regiaoReserva
        }
        onRegionChangeComplete={(regiao) => {
          onRegionChange(regiao);
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        followsUserLocation={false}
        mapType="standard"
        userInterfaceStyle="light"
        onLayout={({ nativeEvent }) => setDimensoesMapa(nativeEvent.layout)}
        onMapReady={mapaPronto}
        onMapLoaded={mapaCarregado}
      >
        {userLocation && (
          <MarcadorMinhaLocalizacao coordenada={userLocation} />
        )}

        {rota.length > 1 && (
          <Polyline
            key={chaveRota}
            coordinates={rota}
            strokeWidth={5}
            strokeColor={alvoEhDestino ? "#2F6BFF" : "#17A673"}
            zIndex={10}
          />
        )}

        {alvo && (
          <Marker
            coordinate={alvo}
            pinColor={alvoEhDestino ? "#D32F2F" : "#17A673"}
            title={alvoEhDestino ? "Destino" : "Embarque"}
          />
        )}
      </MapView>

      <View
        pointerEvents="box-none"
        style={[styles.avisos, { top: insets.top + 64 }]}
      >
        {mapaDemorando && (
          <View accessibilityRole="alert" style={styles.aviso}>
            <Text style={styles.avisoTitulo}>O mapa está demorando a aparecer?</Text>
            <Text style={styles.avisoTexto}>
              Confira sua conexão ou tente carregar novamente.
            </Text>
            <TouchableOpacity
              style={styles.avisoBotao}
              accessibilityRole="button"
              onPress={recarregarMapa}
            >
              <Text style={styles.avisoBotaoTexto}>Tentar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.dispensarAviso} onPress={dispensarAvisoMapa}>
              <Text>O mapa já apareceu</Text>
            </TouchableOpacity>
          </View>
        )}

        {permissao === "negada" ? (
          <View accessibilityRole="alert" style={styles.aviso}>
            <MaterialIcons name="location-off" size={26} color="#D93025" />
            <Text style={styles.avisoTitulo}>Permita o acesso à localização</Text>
            <Text style={styles.avisoTexto}>
              Sem ela você não recebe corridas perto de você.
            </Text>
            <TouchableOpacity style={styles.avisoBotao} onPress={pedirPermissao}>
              <Text style={styles.avisoBotaoTexto}>Permitir</Text>
            </TouchableOpacity>
          </View>
        ) : localizacaoIndisponivel ? (
          <View accessibilityRole="alert" style={styles.aviso}>
            <MaterialIcons name="location-disabled" size={26} color="#E37400" />
            <Text style={styles.avisoTitulo}>Não encontramos sua localização</Text>
            <Text style={styles.avisoTexto}>
              Ative a localização do aparelho ou vá para um local com sinal.
            </Text>
            <TouchableOpacity
              style={styles.avisoBotao}
              onPress={ativarLocalizacao}
              disabled={buscandoPosicao}
            >
              <Text style={styles.avisoBotaoTexto}>
                {buscandoPosicao ? "Procurando..." : "Ativar localização"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Botão para centralizar no usuário */}
      {!isGanhoModalVisible && (alturaFolha > 0 || bottomSheetIndex !== 2) && (
        <Animated.View
          style={[styles.centerButtonContainer, estiloPosicaoCentralizar]}
        >
          <TouchableOpacity
            accessibilityLabel="Centralizar na minha localização"
            accessibilityRole="button"
            style={styles.centerButton}
            onPress={centerOnUser}
            disabled={buscandoPosicao}
          >
            <MaterialIcons
              name={userLocation ? "my-location" : "location-searching"}
              size={24}
              color={buscandoPosicao ? "#ccc" : "#007AFF"}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dispensarAviso: { minHeight: 44, justifyContent: "center" },
  mapContainer: {
    backgroundColor: "#E5E3DF",
  },
  avisos: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 30,
    alignItems: "center",
    gap: 10,
  },
  aviso: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    gap: 4,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  avisoTitulo: {
    color: "#202124",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  avisoTexto: {
    color: "#5F6368",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  avisoBotao: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#111",
    paddingHorizontal: 22,
  },
  avisoBotaoTexto: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  centerButtonContainer: {
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  centerButton: {
    backgroundColor: "white",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
