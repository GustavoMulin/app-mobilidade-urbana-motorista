// CODEX: 286 linhas criadas; oferece controles locais para testar o fluxo do motorista. Remover após validação/commit.
import { Text } from "@/components/common/Texto";
import {
  ETAPAS_SIMULACAO_MOTORISTA,
  type EtapaSimulacaoMotorista,
} from "@/hooks/useSimuladorCorridaMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  ativa: boolean;
  etapa: EtapaSimulacaoMotorista | null;
  finalizada: boolean;
  bloqueado: boolean;
  onIniciar: () => void;
  onSelecionarEtapa: (etapa: EtapaSimulacaoMotorista) => void;
  onFinalizar: () => void;
  onEncerrar: () => void;
}

const rotulos: Record<EtapaSimulacaoMotorista, string> = {
  oferta: "Receber solicitação",
  aceita: "Aceitar corrida",
  motorista_chegou: "Cheguei no embarque",
  em_andamento: "Iniciar corrida",
};

export default function SimuladorCorridaMotorista({
  ativa,
  etapa,
  finalizada,
  bloqueado,
  onIniciar,
  onSelecionarEtapa,
  onFinalizar,
  onEncerrar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const insets = useSafeAreaInsets();

  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Abrir simulador de corrida do motorista"
        style={styles.atalho}
        onPress={() => setAberto(true)}
      >
        <Ionicons name="flask-outline" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={aberto}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAberto(false)}
      >
        <Pressable style={styles.fundo} onPress={() => setAberto(false)}>
          <Pressable
            style={styles.cartao}
            onPress={(evento) => evento.stopPropagation()}
          >
            <ScrollView
              bounces={false}
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 14) + 10,
              }}
            >
              <View style={styles.cabecalho}>
                <View style={styles.cabecalhoTextos}>
                  <Text style={styles.sobreTitulo}>DESENVOLVIMENTO</Text>
                  <Text style={styles.titulo}>Simular corrida do motorista</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Fechar simulador"
                  onPress={() => setAberto(false)}
                >
                  <Ionicons name="close" size={25} color="#111827" />
                </TouchableOpacity>
              </View>

              <Text style={styles.descricao}>
                Este painel altera somente a tela deste aparelho. Nenhuma
                corrida, localização ou cobrança é enviada ao servidor.
              </Text>

              {bloqueado && !ativa && (
                <View style={styles.aviso}>
                  <Ionicons name="warning-outline" size={18} color="#9A5C00" />
                  <Text style={styles.avisoTexto}>
                    Conclua ou recuse a solicitação real antes de iniciar
                    uma simulação.
                  </Text>
                </View>
              )}

              {ETAPAS_SIMULACAO_MOTORISTA.map((item) => {
                const desabilitada = bloqueado && !ativa;

                return (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="button"
                    disabled={desabilitada}
                    style={[
                      styles.etapa,
                      etapa === item && styles.etapaAtiva,
                      desabilitada && styles.desabilitada,
                    ]}
                    onPress={() =>
                      item === "oferta"
                        ? onIniciar()
                        : onSelecionarEtapa(item)
                    }
                  >
                    <Text
                      style={[
                        styles.etapaTexto,
                        etapa === item && styles.etapaTextoAtiva,
                      ]}
                    >
                      {rotulos[item]}
                    </Text>
                    {etapa === item && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                accessibilityRole="button"
                disabled={!ativa}
                style={[styles.finalizar, !ativa && styles.desabilitada]}
                onPress={onFinalizar}
              >
                <Text style={styles.finalizarTexto}>
                  Finalizar corrida simulada
                </Text>
              </TouchableOpacity>

              {(ativa || finalizada) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.limpar}
                  onPress={onEncerrar}
                >
                  <Text style={styles.limparTexto}>
                    {finalizada ? "Limpar resultado" : "Encerrar simulação"}
                  </Text>
                </TouchableOpacity>
              )}

              {finalizada && (
                <Text style={styles.resultado}>
                  Corrida simulada finalizada. Nenhum dado foi enviado.
                </Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // aba na borda esquerda, no meio da tela: no canto de cima cobria botões
  // de várias telas (a escolha de veículo, o "Ir" da navegação...)
  atalho: {
    position: "absolute",
    left: 0,
    top: "46%",
    zIndex: 12000,
    width: 30,
    height: 44,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(51, 65, 85, 0.75)",
    elevation: 12000,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  fundo: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  cartao: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cabecalhoTextos: { flex: 1, paddingRight: 12 },
  sobreTitulo: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  titulo: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },
  descricao: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 12,
  },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    backgroundColor: "#FFF5D6",
    padding: 12,
    marginBottom: 4,
  },
  avisoTexto: { flex: 1, color: "#6B4B17", fontSize: 12, lineHeight: 17 },
  etapa: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  etapaAtiva: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  etapaTexto: { color: "#1E293B", fontSize: 15, fontWeight: "700" },
  etapaTextoAtiva: { color: "#FFFFFF" },
  finalizar: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFCB2F",
    marginTop: 18,
  },
  finalizarTexto: { color: "#111111", fontSize: 15, fontWeight: "800" },
  limpar: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  limparTexto: { color: "#B42318", fontSize: 14, fontWeight: "700" },
  resultado: {
    color: "#15803D",
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
  desabilitada: { opacity: 0.45 },
});
