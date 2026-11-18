import { Text } from "@/components/common/Texto";
import {
  nivelDaDemanda,
  corDaDemanda,
  corDaIntensidade,
  demandaDaRegiao,
  verticesDoHexagono,
  type CamadasDoMapa,
  type MapaDinamico,
} from "@/domain/dinamica";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker, Polygon } from "react-native-maps";
import { useTema } from "@/theme/tema";

interface Props {
  mapa: MapaDinamico;
  camadas: CamadasDoMapa;
}

const SEM_PREENCHIMENTO = "rgba(0,0,0,0)";

/**
 * Camadas do mapa de calor, dentro do MapView:
 * - Demanda: manchas sem borda por baixo, mais fortes onde há mais procura, com
 *   de 1 a 4 bonequinhos no centro;
 * - Tarifas: só as bordas dos hexágonos (sem fundo) e, no centro, o valor extra
 *   ("1,5x" ou "+R$2,25").
 */
function RegioesDinamicas({ mapa, camadas }: Props) {
  const desenhos = useMemo(
    () =>
      mapa.regioes.map((regiao) => ({
        regiao,
        cores: corDaIntensidade(regiao.intensidade),
        vertices: verticesDoHexagono(regiao, mapa.raio_metros),
      })),
    [mapa],
  );

  // a demanda vale sozinha: cobre também onde não há tarifa
  const manchas = useMemo(() => {
    const comTarifa = new Set(mapa.regioes.map((regiao) => regiao.celula));
    const lista =
      mapa.demandas ??
      mapa.regioes.map((regiao) => ({
        celula: regiao.celula,
        latitude: regiao.latitude,
        longitude: regiao.longitude,
        demanda: demandaDaRegiao(regiao),
      }));

    return lista.map((area) => ({
      area,
      corDaMancha: corDaDemanda(area.demanda),
      bonequinhos: nivelDaDemanda(area.demanda),
      vertices: verticesDoHexagono(area, mapa.raio_metros),
      temTarifa: comTarifa.has(area.celula),
    }));
  }, [mapa]);

  return (
    <>
      {camadas.demanda &&
        manchas.map(({ area, corDaMancha, vertices }) => (
          <Polygon
            key={`mancha:${area.celula}`}
            coordinates={vertices}
            fillColor={corDaMancha}
            strokeWidth={0}
            strokeColor="rgba(0,0,0,0)"
            // por baixo de tudo, inclusive das bordas das tarifas
            zIndex={1}
          />
        ))}
      {camadas.tarifas &&
        desenhos.map(({ regiao, cores, vertices }) => (
          <Polygon
            key={`area:${regiao.celula}`}
            coordinates={vertices}
            fillColor={SEM_PREENCHIMENTO}
            strokeColor={cores.borda}
            strokeWidth={1.5}
            // abaixo da rota (10) e dos pontos da corrida (20)
            zIndex={2}
          />
        ))}
      {camadas.demanda &&
        manchas
          // só onde a procura é relevante: um marcador por célula pesa
          .filter(({ area }) => area.demanda >= 0.2)
          .map(({ area, bonequinhos, temTarifa }) => (
            <BonequinhosDaRegiao
              key={`gente:${area.celula}:${bonequinhos}:${camadas.tarifas && temTarifa}`}
              regiao={area}
              quantidade={bonequinhos}
              // com o valor no centro, os bonequinhos descem para não cobri-lo
              abaixoDoCentro={camadas.tarifas && temTarifa}
            />
          ))}
      {camadas.tarifas &&
        desenhos.map(({ regiao, cores }) => (
          <RotuloDaRegiao
            key={`valor:${regiao.celula}:${regiao.rotulo}`}
            regiao={regiao}
            cor={cores.rotulo}
          />
        ))}
    </>
  );
}

// No Android o Marker com View só desenha o conteúdo se acompanhar a mudança
// da view no primeiro quadro; depois disso volta a false para não pesar.
function useRastrearPorUmMomento() {
  const [rastrear, setRastrear] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setRastrear(false), 1200);

    return () => clearTimeout(timer);
  }, []);

  return rastrear;
}

function BonequinhosDaRegiao({
  regiao,
  quantidade,
  abaixoDoCentro,
}: {
  regiao: { latitude: number; longitude: number };
  quantidade: number;
  abaixoDoCentro: boolean;
}) {
  const rastrear = useRastrearPorUmMomento();
  const { escuro } = useTema();
  const cor = "#FFFFFF";

  return (
    <Marker
      // o tema entra na chave de desenho: o marcador congela depois do 1º quadro
      key={escuro ? "escuro" : "claro"}
      coordinate={regiao}
      anchor={{ x: 0.5, y: abaixoDoCentro ? -0.45 : 0.5 }}
      tracksViewChanges={rastrear}
      tappable={false}
      zIndex={2}
    >
      <View style={[styles.bonequinhos, escuro && styles.bonequinhosEscuro]}>
        {quantidade === 3 ? (
          // demanda extrema: o ícone de grupo com 3 pessoas
          <MaterialIcons name="groups" size={24} color={cor} />
        ) : quantidade === 2 ? (
          // demanda alta: o ícone de duas pessoas
          <Ionicons name="people" size={19} color={cor} />
        ) : (
          <Ionicons name="person" size={16} color={cor} />
        )}
      </View>
    </Marker>
  );
}

function RotuloDaRegiao({
  regiao,
  cor,
}: {
  regiao: MapaDinamico["regioes"][number];
  cor: string;
}) {
  const rastrear = useRastrearPorUmMomento();

  return (
    <Marker
      coordinate={regiao}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={rastrear}
      // o toque cai no mapa, não neste rótulo
      tappable={false}
      zIndex={3}
    >
      <View style={[styles.rotulo, { backgroundColor: cor }]}>
        <Text style={styles.texto}>{regiao.rotulo}</Text>
      </View>
    </Marker>
  );
}

export default memo(RegioesDinamicas);

const styles = StyleSheet.create({
  rotulo: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  texto: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  bonequinhos: {
    flexDirection: "row",
    // sem fundo: só as silhuetas, para ocupar o mínimo do hexágono
    marginHorizontal: -1,
  },
  bonequinhosEscuro: {},
});
