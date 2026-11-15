import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { Text } from "@/components/common/Texto";
import type { SeloDeAvaliacao } from "@/domain/avaliacao";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  selos: SeloDeAvaliacao[];
  escolhidos: string[];
  onAlternar: (chave: string) => void;
  desabilitado?: boolean;
  // lado da imagem do selo (o perfil público usa 112)
  tamanho?: number;
}

/** Selos em grade de 3 colunas, com a imagem grande e o nome embaixo, como no perfil público. */
export default function SelosEmGrade({
  selos,
  escolhidos,
  onAlternar,
  desabilitado = false,
  tamanho = 88,
}: Props) {
  return (
    <View style={styles.grade}>
      {selos.map((selo) => {
        const marcado = escolhidos.includes(selo.chave);

        return (
          <TouchableOpacity
            key={selo.chave}
            accessibilityRole="button"
            accessibilityState={{ selected: marcado, disabled: desabilitado }}
            accessibilityLabel={selo.titulo}
            disabled={desabilitado}
            activeOpacity={0.7}
            onPress={() => onAlternar(selo.chave)}
            style={styles.item}
          >
            <View
              style={[
                styles.imagem,
                {
                  width: tamanho + 10,
                  height: tamanho + 10,
                  borderRadius: (tamanho + 10) / 2,
                },
                marcado && styles.imagemMarcada,
              ]}
            >
              <IconeDoSelo
                imagem={selo.imagem}
                icone={selo.icone}
                tamanho={tamanho}
              />
              {marcado && (
                <View style={styles.marca}>
                  <Ionicons name="checkmark" size={16} color="#111" />
                </View>
              )}
            </View>
            <Text
              style={[styles.titulo, marcado && styles.tituloMarcado]}
              numberOfLines={2}
            >
              {selo.titulo}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: "row", flexWrap: "wrap", rowGap: 14 },
  item: { width: "33.333%", alignItems: "center", paddingHorizontal: 4 },
  imagem: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  imagemMarcada: { borderColor: "#fbc02d", backgroundColor: "#FFF6D6" },
  marca: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fbc02d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  titulo: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  tituloMarcado: { color: "#111", fontWeight: "800" },
});
