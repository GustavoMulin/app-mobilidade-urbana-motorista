import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { type LatLng, Marker } from "react-native-maps";
import { useTema } from "@/theme/tema";

const AZUL = "#2F7BE8";
// no mapa escuro o azul normal some: um azul mais vivo e claro destaca do fundo
const AZUL_NO_ESCURO = "#2E9BFF";

// ícone "navigation" do Material dentro de um círculo transparente com aro azul. O
// marcador acompanha as mudanças sempre: o ícone vem de uma fonte que carrega
// depois do primeiro desenho, e congelar cedo deixava o círculo vazio (é o
// mesmo cuidado dos outros marcadores do mapa)
export default function MarcadorMinhaLocalizacao({
  coordenada,
  rumo,
}: {
  coordenada: LatLng;
  // graus a partir do norte: na navegação o marcador gira com o carro
  rumo?: number;
}) {
  const { escuro } = useTema();
  const cor = escuro ? AZUL_NO_ESCURO : AZUL;

  return (
    <Marker
      coordinate={coordenada}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={rumo !== undefined}
      rotation={rumo ?? 0}
      tracksViewChanges
      zIndex={20}
      accessibilityLabel="Sua localização"
    >
      <View style={[styles.circulo, { borderColor: cor }]}>
        <MaterialIcons name="navigation" size={24} color={cor} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  circulo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    // fundo transparente: sombra de fundo aparece como mancha, então sai junto
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: AZUL,
    alignItems: "center",
    justifyContent: "center",
  },
});
