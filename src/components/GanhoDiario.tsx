import { Text } from "@/components/common/Texto";
import { useHistoricoCorridas } from "@/hooks/useHistoricoCorridas";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HistoricoCorridas from "./HistoricoCorridas";

interface GanhoDiarioProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  corridaAtivaId: number | null;
  ocultarAtalho?: boolean;
}

const valorNumerico = (valor: string) => {
  const normalizado = valor
    .replace(/[^0-9,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
};

export default function GanhoDiario({
  visible,
  setVisible,
  corridaAtivaId,
  ocultarAtalho = false,
}: GanhoDiarioProps) {
  const [mostrarValor, setMostrarValor] = useState(true);
  const { itens, carregando, erro, recarregar } = useHistoricoCorridas(true);
  const corridaAnterior = useRef(corridaAtivaId);
  const hoje = new Date().toLocaleDateString("pt-BR");

  useEffect(() => {
    if (corridaAnterior.current !== null && corridaAtivaId === null) {
      void recarregar();
    }
    corridaAnterior.current = corridaAtivaId;
  }, [corridaAtivaId, recarregar]);

  const totalHoje = useMemo(
    () =>
      itens
        .filter(
          (item) => item.date === hoje && (item.isFinalized || item.isNoShow),
        )
        .reduce((total, item) => total + valorNumerico(item.driverEarned), 0),
    [hoje, itens],
  );

  const valor =
    carregando && itens.length === 0
      ? "—"
      : `R$ ${totalHoje.toFixed(2).replace(".", ",")}`;

  return (
    <>
      <HistoricoCorridas visible={visible} onClose={() => setVisible(false)} />

      {!ocultarAtalho && (
        <SafeAreaView style={styles.container} pointerEvents="box-none">
          <View style={styles.valorButton}>
            <TouchableOpacity
              onPress={() => setMostrarValor((atual) => !atual)}
              accessibilityRole="button"
              accessibilityLabel={
                mostrarValor
                  ? "Ocultar ganhos de hoje"
                  : "Mostrar ganhos de hoje"
              }
            >
              <Ionicons
                name={mostrarValor ? "eye" : "eye-off"}
                size={19}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={styles.separator} />

            <TouchableOpacity
              onPress={() => setVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir histórico de corridas"
            >
              <Text style={styles.valorText}>
                {mostrarValor ? (erro ? "Indisponível" : valor) : "••••••"}
              </Text>
            </TouchableOpacity>

            <Ionicons name="chevron-down" size={18} color="#fff" />
          </View>
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  valorButton: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: "#666",
  },
  valorText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
