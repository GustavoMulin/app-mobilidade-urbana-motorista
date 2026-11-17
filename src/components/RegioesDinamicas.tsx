import { Text } from "@/components/common/Texto";
import {
  corDaIntensidade,
  verticesDoHexagono,
  type MapaDinamico,
} from "@/domain/dinamica";
import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker, Polygon } from "react-native-maps";

interface Props {
  mapa: MapaDinamico;
}

/**
 * Camada do mapa com as regiões de alta demanda: cada hexágono pintado do
 * amarelo ao vermelho e, no centro, o valor extra ("1,5x" ou "+R$2,25").
 * Vai dentro do MapView.
 */
function RegioesDinamicas({ mapa }: Props) {
  const desenhos = useMemo(
    () =>
      mapa.regioes.map((regiao) => ({
        regiao,
        cores: corDaIntensidade(regiao.intensidade),
        vertices: verticesDoHexagono(regiao, mapa.raio_metros),
      })),
    [mapa],
  );

  return (
    <>
      {desenhos.map(({ regiao, cores, vertices }) => (
        <Polygon
          key={`area:${regiao.celula}`}
          coordinates={vertices}
          fillColor={cores.preenchimento}
          strokeColor={cores.borda}
          strokeWidth={1.5}
          // abaixo da rota (10) e dos pontos da corrida (20)
          zIndex={1}
        />
      ))}
      {desenhos.map(({ regiao, cores }) => (
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
function RotuloDaRegiao({
  regiao,
  cor,
}: {
  regiao: MapaDinamico["regioes"][number];
  cor: string;
}) {
  const [rastrear, setRastrear] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setRastrear(false), 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={regiao}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={rastrear}
      // o toque cai no mapa, não neste rótulo
      tappable={false}
      zIndex={2}
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
});
