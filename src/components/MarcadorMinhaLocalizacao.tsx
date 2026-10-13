import { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";
import { type LatLng, Marker } from "react-native-maps";

// ponto azul com aro branco e halo. É imagem (não View) e o mapa só congela o
// desenho depois que ela carrega: com View, o Android às vezes fotografava o
// marcador pela metade e sobrava só o halo azul transparente
export default function MarcadorMinhaLocalizacao({
  coordenada,
}: {
  coordenada: LatLng;
}) {
  const [carregada, setCarregada] = useState(false);
  const [congelado, setCongelado] = useState(false);

  useEffect(() => {
    if (!carregada) return;
    const espera = setTimeout(() => setCongelado(true), 300);
    return () => clearTimeout(espera);
  }, [carregada]);

  return (
    <Marker
      coordinate={coordenada}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!congelado}
      zIndex={20}
      accessibilityLabel="Sua localização"
    >
      <Image
        source={require("../../assets/images/minha-localizacao.png")}
        style={styles.imagem}
        fadeDuration={0}
        onLoad={() => setCarregada(true)}
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  imagem: { width: 44, height: 44 },
});
