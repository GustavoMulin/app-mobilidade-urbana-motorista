import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { type LatLng, Marker } from "react-native-maps";

const AZUL = "#2F7BE8";

// ícone "navigation" do Material dentro de um círculo claro com aro azul. O
// marcador acompanha as mudanças sempre: o ícone vem de uma fonte que carrega
// depois do primeiro desenho, e congelar cedo deixava o círculo vazio (é o
// mesmo cuidado dos outros marcadores do mapa)
export default function MarcadorMinhaLocalizacao({
  coordenada,
}: {
  coordenada: LatLng;
}) {
  return (
    <Marker
      coordinate={coordenada}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges
      zIndex={20}
      accessibilityLabel="Sua localização"
    >
      <View style={styles.circulo}>
        <MaterialIcons name="navigation" size={24} color={AZUL} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  circulo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFDF8",
    borderWidth: 2,
    borderColor: AZUL,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});
