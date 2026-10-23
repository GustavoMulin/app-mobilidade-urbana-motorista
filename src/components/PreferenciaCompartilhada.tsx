import { Text } from "@/components/common/Texto";
import { useToast } from "@/context/ToastContext";
import { api } from "@/Services/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";

interface Preferencias {
  aceita_compartilhada: boolean;
  assentos: number | null;
  // desistiu de um grupo: sem chamadas de grupo até este horário
  suspensa_texto?: string | null;
}

const MIN_ASSENTOS = 1;
const MAX_ASSENTOS = 6;

// Motorista novo começa sem compartilhada e liga aqui quando quiser. Recusar
// não pesa na taxa de aceitação; sem lugar para o grupo, a chamada nem aparece.
export default function PreferenciaCompartilhada({
  visivel,
}: {
  visivel: boolean;
}) {
  const { mostrarToast } = useToast();
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visivel) return;
    let ativo = true;
    api
      .get<Preferencias>("/motorista/me/preferencias")
      .then(({ data }) => {
        if (ativo) setPreferencias(data);
      })
      .catch(() => {
        if (ativo) setPreferencias(null);
      });
    return () => {
      ativo = false;
    };
  }, [visivel]);

  const salvar = async (mudanca: Partial<Preferencias>) => {
    if (preferencias === null || salvando) return;
    const anterior = preferencias;
    setPreferencias({ ...preferencias, ...mudanca });
    setSalvando(true);
    try {
      const { data } = await api.put<Preferencias>(
        "/motorista/me/preferencias",
        mudanca,
      );
      setPreferencias(data);
    } catch {
      setPreferencias(anterior);
      mostrarToast({
        tipo: "error",
        titulo: "Não foi possível salvar",
        mensagem: "Confira sua conexão e tente de novo.",
      });
    } finally {
      setSalvando(false);
    }
  };

  if (preferencias === null) {
    return (
      <View style={[styles.cartao, styles.carregando]}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  const assentos = preferencias.assentos;

  return (
    <View style={styles.cartao}>
      <View style={styles.linha}>
        <Ionicons name="people-outline" size={26} color="#111" />
        <View style={styles.textos}>
          <Text style={styles.titulo}>Aceito compartilhadas</Text>
          <Text style={styles.apoio}>
            Vários passageiros na mesma viagem, com valor maior e adicional por
            embarque. Recusar não conta na sua taxa de aceitação.
          </Text>
        </View>
        <Switch
          value={preferencias.aceita_compartilhada}
          onValueChange={(valor) =>
            void salvar({ aceita_compartilhada: valor })
          }
          trackColor={{ true: "#17A673", false: "#D1D5DB" }}
          thumbColor="#FFF"
          accessibilityLabel="Aceito compartilhadas"
        />
      </View>

      {preferencias.suspensa_texto ? (
        <View style={styles.suspensao} accessibilityRole="alert">
          <Ionicons name="time-outline" size={18} color="#9A5B00" />
          <Text style={styles.suspensaoTexto}>
            {preferencias.suspensa_texto}
          </Text>
        </View>
      ) : null}

      {assentos !== null && (
        <View style={[styles.linha, styles.linhaAssentos]}>
          <Ionicons name="car-outline" size={26} color="#111" />
          <View style={styles.textos}>
            <Text style={styles.titulo}>Lugares para passageiros</Text>
            <Text style={styles.apoio}>
              Grupos maiores que isso não chegam para você.
            </Text>
          </View>
          <View style={styles.contador}>
            <TouchableOpacity
              style={styles.passo}
              accessibilityRole="button"
              accessibilityLabel="Menos um lugar"
              disabled={assentos <= MIN_ASSENTOS || salvando}
              onPress={() => void salvar({ assentos: assentos - 1 })}
            >
              <Ionicons name="remove" size={18} color="#111" />
            </TouchableOpacity>
            <Text
              style={styles.valor}
              accessibilityLabel={`${assentos} lugares`}
            >
              {assentos}
            </Text>
            <TouchableOpacity
              style={styles.passo}
              accessibilityRole="button"
              accessibilityLabel="Mais um lugar"
              disabled={assentos >= MAX_ASSENTOS || salvando}
              onPress={() => void salvar({ assentos: assentos + 1 })}
            >
              <Ionicons name="add" size={18} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  carregando: { minHeight: 80, justifyContent: "center" },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  linhaAssentos: { borderTopWidth: 1, borderTopColor: "#EEF0F3" },
  suspensao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#FFF4DE",
    padding: 12,
    marginBottom: 10,
  },
  suspensaoTexto: { flex: 1, fontSize: 13, color: "#5C3B00", lineHeight: 18 },
  textos: { flex: 1 },
  titulo: { fontSize: 16, fontWeight: "700", color: "#111" },
  apoio: { fontSize: 13, color: "#6B7280", marginTop: 2, lineHeight: 18 },
  contador: { flexDirection: "row", alignItems: "center", gap: 8 },
  passo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F3F5",
    alignItems: "center",
    justifyContent: "center",
  },
  valor: {
    minWidth: 18,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
  },
});
