import IconeDoSelo from "@/components/avaliacao/IconeDoSelo";
import { Text } from "@/components/common/Texto";
import type { SeloDaNota } from "@/domain/perfilMotorista";
import { StyleSheet, View } from "react-native";

interface Props {
  selos: SeloDaNota[];
  // lado de cada selo
  tamanho?: number;
  // quantos selos aparecem; os demais viram "+N"
  maximo?: number;
}

/**
 * Os selos que uma avaliação recebeu, em círculos pequenos (imagem ou emoji).
 * Sem selos não desenha nada, para o comentário seguir só com o texto.
 */
export default function SelosDaNota({
  selos,
  tamanho = 28,
  maximo = 4,
}: Props) {
  if (selos.length === 0) return null;

  const visiveis = selos.slice(0, maximo);
  const restantes = selos.length - visiveis.length;

  return (
    <View
      style={styles.linha}
      accessible
      accessibilityLabel={`Selos: ${selos.map((selo) => selo.titulo).join(", ")}`}
    >
      {visiveis.map((selo) => (
        <IconeDoSelo
          key={selo.chave}
          imagem={selo.imagem}
          icone={selo.icone}
          tamanho={tamanho}
        />
      ))}
      {restantes > 0 && <Text style={styles.restantes}>+{restantes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 6 },
  restantes: { fontSize: 13, fontWeight: "700", color: "#888" },
});
