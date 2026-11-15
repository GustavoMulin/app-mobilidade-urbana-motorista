import SelosEmGrade from "@/components/avaliacao/SelosEmGrade";
import { Text } from "@/components/common/Texto";
import {
  alternarSelo,
  podeEscolherSelos,
  type SeloDeAvaliacao,
} from "@/domain/avaliacao";
import { CorridaParaAvaliar } from "@/hooks/useAvaliacaoPendente";
import { useSelosAvaliacao } from "@/hooks/useSelosAvaliacao";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  corrida: CorridaParaAvaliar;
  enviando: boolean;
  // o motorista avalia com nota e selos; só o passageiro escreve comentário
  onAvaliar: (nota: number, elogios: string[]) => void;
  // bloqueia o passageiro; devolve se deu certo
  onBloquear: () => Promise<boolean>;
  onDispensar: () => void;
  // selos prontos (simulador e testes); sem isto a lista vem do servidor
  selosProntos?: SeloDeAvaliacao[];
}

const ESTRELAS = [1, 2, 3, 4, 5];

export default function AvaliarPassageiro({
  corrida,
  enviando,
  onAvaliar,
  onBloquear,
  onDispensar,
  selosProntos,
}: Props) {
  const insets = useSafeAreaInsets();
  const selosDoServidor = useSelosAvaliacao(!selosProntos);
  const selos = selosProntos ?? selosDoServidor;

  const [nota, setNota] = useState(0);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [bloqueando, setBloqueando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  const bloquear = async () => {
    setBloqueando(true);
    const ok = await onBloquear();
    setBloqueando(false);
    if (ok) setBloqueado(true);
  };

  // bloquear pede confirmação (mesma caixa do resto do app)
  const confirmarBloqueio = () =>
    Alert.alert(
      "Bloquear usuário?",
      `Você não receberá mais chamadas de ${passageiro ?? "este passageiro"}.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Bloquear", style: "destructive", onPress: () => void bloquear() },
      ],
    );

  const passageiro = corrida.convidado_nome || corrida.passageiro?.name;

  // com 4 ou 5 estrelas os selos ficam liberados; a avaliação já pode ser enviada
  // assim que há uma nota, com ou sem selo
  const selosLiberados = podeEscolherSelos(nota);

  return (
    <View style={styles.sobreposicao}>
      {/* o painel sobe até perto do topo: nota e selos cabem na mesma visão */}
      <View style={[styles.painel, { top: insets.top + 12 }]}>
        <ScrollView
          style={styles.corpo}
          contentContainerStyle={styles.corpoConteudo}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pergunta}>Como foi a viagem?</Text>
          <Text style={styles.nomePassageiro} numberOfLines={1}>
            {passageiro ?? "Passageiro"}
          </Text>

          <View style={styles.estrelas}>
            {ESTRELAS.map((valorEstrela) => (
              <TouchableOpacity
                key={valorEstrela}
                accessibilityRole="button"
                accessibilityLabel={`${valorEstrela} ${valorEstrela === 1 ? "estrela" : "estrelas"}`}
                onPress={() => setNota(valorEstrela)}
                disabled={enviando}
                hitSlop={6}
                style={styles.estrela}
              >
                <Ionicons
                  name={valorEstrela <= nota ? "star" : "star-outline"}
                  size={52}
                  color={valorEstrela <= nota ? "#fbc02d" : "#C9CDD2"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* selos na mesma visão das estrelas; liberados com 4 ou 5 estrelas */}
          {selos.length > 0 && (
            <View style={styles.selos}>
              <Text style={styles.selosTitulo}>Deixe um selo</Text>
              <Text style={styles.selosApoio}>
                {selosLiberados
                  ? "Opcional: toque nos selos que combinam com o passageiro"
                  : "Disponível com 4 ou 5 estrelas"}
              </Text>
              <View style={!selosLiberados && styles.selosBloqueados}>
                <SelosEmGrade
                  selos={selos}
                  escolhidos={selosLiberados ? escolhidos : []}
                  onAlternar={(chave) =>
                    setEscolhidos((atuais) => alternarSelo(atuais, chave))
                  }
                  desabilitado={enviando || !selosLiberados}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* rodapé fixo: enviar fica à mão assim que há nota */}
        <View
          style={[
            styles.rodape,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          {nota === 1 && bloqueado && (
            <View style={styles.bloqueado}>
              <Ionicons name="ban" size={16} color="#B3261E" />
              <Text style={styles.bloqueadoTexto}>
                Passageiro bloqueado: você não receberá mais chamadas dele
              </Text>
            </View>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.botao, nota === 0 && styles.botaoDesativado]}
            disabled={nota === 0 || enviando}
            onPress={() => onAvaliar(nota, selosLiberados ? escolhidos : [])}
          >
            <Text
              style={[
                styles.textoBotao,
                nota === 0 && styles.textoBotaoDesativado,
              ]}
            >
              {enviando ? "Enviando..." : "Enviar e continuar"}
            </Text>
          </TouchableOpacity>

          <View style={styles.acoes}>
            {nota === 1 && !bloqueado && (
              <TouchableOpacity
                style={styles.acao}
                disabled={enviando || bloqueando}
                onPress={confirmarBloqueio}
              >
                <Ionicons name="ban-outline" size={18} color="#B3261E" />
                <Text style={styles.textoBloquear}>Bloquear usuário</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.acao}
              disabled={enviando}
              onPress={onDispensar}
            >
              <Text style={styles.textoPular}>Lembrar depois</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 50,
  },
  painel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  corpo: { flex: 1 },
  corpoConteudo: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 16 },
  pergunta: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111",
    marginTop: 10,
    textAlign: "center",
  },
  nomePassageiro: {
    fontSize: 27,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginTop: 18,
  },
  estrelas: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  estrela: { paddingHorizontal: 4 },
  selos: { marginTop: 26 },
  selosTitulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  selosApoio: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  selosBloqueados: { opacity: 0.35 },
  rodape: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#FFF",
  },
  botao: {
    backgroundColor: "#fbc02d",
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
  },
  botaoDesativado: { backgroundColor: "#EEE" },
  textoBotao: { fontSize: 22, fontWeight: "800", color: "#111" },
  textoBotaoDesativado: { color: "#9AA0A6" },
  acoes: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 6,
  },
  acao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  textoBloquear: { fontSize: 16, color: "#B3261E", fontWeight: "600" },
  textoPular: { fontSize: 16, color: "#888" },
  bloqueado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FDECEA",
  },
  bloqueadoTexto: { flex: 1, fontSize: 14, color: "#B3261E" },
});
