import { Text } from "@/components/common/Texto";
import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import type { SeloDeAvaliacao } from "@/domain/avaliacao";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  selos: SeloDeAvaliacao[];
  escolhidos: string[];
  onAlternar: (chave: string) => void;
  desabilitado?: boolean;
}

/** Selos (elogios) para marcar ao avaliar: ícone e texto, vários ao mesmo tempo. */
export default function SelosParaEscolher({
  selos,
  escolhidos,
  onAlternar,
  desabilitado = false,
}: Props) {
  return (
    <View style={styles.lista}>
      {selos.map((selo) => {
        const marcado = escolhidos.includes(selo.chave);

        return (
          <TouchableOpacity
            key={selo.chave}
            accessibilityRole="button"
            accessibilityState={{ selected: marcado }}
            accessibilityLabel={selo.titulo}
            disabled={desabilitado}
            onPress={() => onAlternar(selo.chave)}
            style={[styles.selo, marcado && styles.seloMarcado]}
          >
            <IconeDoSelo imagem={selo.imagem} icone={selo.icone} tamanho={28} />
            <Text style={[styles.titulo, marcado && styles.tituloMarcado]}>
              {selo.titulo}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFF",
  },
  seloMarcado: { borderColor: "#fbc02d", backgroundColor: "#FFF6D6" },
  icone: { fontSize: 18 },
  titulo: { fontSize: 13, color: "#444" },
  tituloMarcado: { color: "#111", fontWeight: "700" },
});
