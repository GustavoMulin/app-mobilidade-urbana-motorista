import { Text, TextInput } from "@/components/common/Texto";
import type { OfertaCorrida } from "@/hooks/useDespachoMotorista";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PASSO = 0.5;

export function segundosDaProposta(expiraEm?: string | null) {
  if (!expiraEm) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(expiraEm).getTime() - Date.now()) / 1000),
  );
}

export function EsperaProposta({
  expiraEm,
  onExpirar,
}: {
  expiraEm?: string | null;
  onExpirar: () => void;
}) {
  const [segundos, setSegundos] = useState(() =>
    segundosDaProposta(expiraEm),
  );

  useEffect(() => {
    let anterior = segundosDaProposta(expiraEm);
    const inicial = setTimeout(() => setSegundos(anterior), 0);
    const relogio = setInterval(() => {
      const atual = segundosDaProposta(expiraEm);
      setSegundos(atual);
      if (anterior > 0 && atual === 0) onExpirar();
      anterior = atual;
    }, 1000);
    return () => {
      clearTimeout(inicial);
      clearInterval(relogio);
    };
  }, [expiraEm, onExpirar]);

  return (
    <View style={styles.espera}>
      <ActivityIndicator size="small" color="#111" />
      <Text style={styles.esperaTexto}>
        Esperando passageiro aceitar ({segundos} s)
      </Text>
    </View>
  );
}

interface Props {
  oferta: OfertaCorrida | null;
  ocupado: boolean;
  onClose: () => void;
  onConfirmar: (corridaId: number, valor: number) => void | Promise<void>;
}

export default function OfertaNegociaMotorista({
  oferta,
  ocupado,
  onClose,
  onConfirmar,
}: Props) {
  const insets = useSafeAreaInsets();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!oferta) return;
    const atualizacao = setTimeout(() => setValor(oferta.valor_motorista), 0);
    return () => clearTimeout(atualizacao);
  }, [oferta]);

  const alterar = (diferenca: number) => {
    if (!oferta) return;
    const minimo = oferta.valor_motorista;
    const maximo = oferta.valor_motorista * 2;
    setValor((atual) =>
      Math.min(
        maximo,
        Math.max(minimo, Math.round((atual + diferenca) * 100) / 100),
      ),
    );
  };

  const confirmar = async () => {
    if (!oferta || ocupado) return;
    await onConfirmar(oferta.corrida_id, valor);
    onClose();
  };

  return (
    <Modal
      visible={oferta !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.raiz}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.fundo} onPress={onClose} />
        <View
          style={[
            styles.folha,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.aviso}>
            <Ionicons name="notifications" size={19} color="#77808C" />
            <Text style={styles.avisoTexto}>
              Ofertas menores têm mais chances!
            </Text>
          </View>
          <View style={styles.cabecalho}>
            <View style={styles.textos}>
              <Text style={styles.titulo}>Sua oferta</Text>
              <Text style={styles.apoio}>
                O passageiro receberá sua proposta para escolher.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.fechar}
              onPress={onClose}
              accessibilityLabel="Fechar oferta"
            >
              <Ionicons name="close" size={26} color="#777" />
            </TouchableOpacity>
          </View>

          <View style={styles.editor}>
            <TouchableOpacity
              style={styles.passo}
              onPress={() => alterar(-PASSO)}
              disabled={valor <= (oferta?.valor_motorista ?? 0)}
            >
              <Text style={styles.passoTexto}>-0,50</Text>
            </TouchableOpacity>

            <View style={styles.valorCaixa}>
              <Text style={styles.moeda}>R$</Text>
              <TextInput
                value={valor.toFixed(2).replace(".", ",")}
                onChangeText={(texto) => {
                  const numero = Number(texto.replace(",", "."));
                  if (Number.isFinite(numero)) setValor(numero);
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={styles.campo}
                accessibilityLabel="Valor da oferta"
              />
            </View>

            <TouchableOpacity style={styles.passo} onPress={() => alterar(PASSO)}>
              <Text style={styles.passoTexto}>+0,50</Text>
            </TouchableOpacity>
          </View>

          {oferta ? (
            <Text style={styles.valorKm}>
              R$
              {(valor / Math.max(oferta.distancia_corrida_km, 0.1))
                .toFixed(2)
                .replace(".", ",")}
              /km
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmar, ocupado && styles.desabilitado]}
            onPress={() => void confirmar()}
            disabled={ocupado}
          >
            {ocupado ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.confirmarTexto}>Confirmar oferta</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "flex-end" },
  fundo: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(22,27,33,0.68)",
  },
  folha: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  aviso: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ECEEF1",
  },
  avisoTexto: { fontSize: 16, color: "#555C65" },
  cabecalho: {
    flexDirection: "row",
    paddingTop: 20,
    alignItems: "flex-start",
  },
  textos: { flex: 1 },
  titulo: { fontSize: 23, fontWeight: "800", color: "#111" },
  apoio: {
    maxWidth: 310,
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
    color: "#6D7075",
  },
  fechar: { padding: 5 },
  editor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 30,
  },
  passo: {
    width: 82,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#E0E2E5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  passoTexto: { fontSize: 18, fontWeight: "800", color: "#111" },
  valorCaixa: {
    minWidth: 130,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#F1F2F4",
  },
  moeda: { fontSize: 23, fontWeight: "800", color: "#111" },
  campo: {
    minWidth: 78,
    paddingVertical: 0,
    fontSize: 25,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  valorKm: {
    textAlign: "center",
    marginTop: 7,
    color: "#7A7D82",
    fontSize: 14,
  },
  confirmar: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFD400",
    marginTop: 26,
  },
  confirmarTexto: { fontSize: 19, fontWeight: "800", color: "#111" },
  desabilitado: { opacity: 0.55 },
  espera: {
    minHeight: 53,
    flexDirection: "row",
    gap: 10,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F1F3",
    marginTop: 20,
  },
  esperaTexto: { fontSize: 16, fontWeight: "700", color: "#222" },
});
