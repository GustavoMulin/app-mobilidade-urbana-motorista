import { Text } from "@/components/common/Texto";
import IconePermPhoneMsg from "@/components/IconePermPhoneMsg";
import { useTema } from "@/theme/tema";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";

interface Props {
  // o selo conta o que chegou no chat sem ser lido
  naoLidas: number;
  // ausente quando não dá para conversar (ou não há telefone)
  onChat?: () => void;
  onLigar?: () => void;
  // mesmo tamanho e cor dos outros botões da linha
  estilo: ViewStyle;
}

/**
 * Um botão só para falar com o passageiro (ícone perm_phone_msg): abre a conversa
 * (chat) e, quando o chat não está disponível, liga. O selo conta o que chegou
 * sem ser lido.
 */
export default function BotaoContatoPassageiro({
  naoLidas,
  onChat,
  onLigar,
  estilo,
}: Props) {
  const { cores } = useTema();

  if (!onChat && !onLigar) return null;

  // abre a conversa; sem chat disponível, liga
  const abrir = () => {
    (onChat ?? onLigar)?.();
  };

  return (
    <TouchableOpacity
      style={estilo}
      onPress={abrir}
      accessibilityRole="button"
      accessibilityLabel={`Falar com o passageiro${naoLidas > 0 ? `, ${naoLidas} ${naoLidas === 1 ? "mensagem nova" : "mensagens novas"}` : ""}`}
    >
      <IconePermPhoneMsg size={30} color={cores.icone} />
      {naoLidas > 0 ? (
        <View style={styles.selo}>
          <Text style={styles.seloTexto}>{naoLidas > 9 ? "9+" : naoLidas}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  selo: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5372B",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  seloTexto: { color: "#FFF", fontSize: 10, fontWeight: "800" },
});
