import { Text } from "@/components/common/Texto";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Buscando from "./Buscando";

import Preferencias from "./Preferencias";

interface props {
  setSolicitacoesCorrida: () => void;
  disponivel: boolean;
  emCorrida: boolean;
  ocupado: boolean;
  onAlternarDisponibilidade: (proximoEstado: boolean) => void;
  onAlturaChange?: (altura: number) => void;
}

export default function MenuInferiorMotorista({
  setSolicitacoesCorrida,
  disponivel,
  emCorrida,
  ocupado,
  onAlternarDisponibilidade,
  onAlturaChange,
}: props) {
  const [dialogPreferenciasVisible, setDialogPreferenciasVisibleLocal] =
    useState(false);

  // em corrida não se desconecta pelo botão: a corrida tem os próprios passos
  const bloqueado = ocupado || emCorrida;

  const alternar = () => {
    if (bloqueado) return;

    // online, um toque sem querer no "Buscando" tirava o motorista do ar:
    // como no 99, desconectar fica em Preferências › Desconectar
    if (disponivel) {
      setDialogPreferenciasVisibleLocal(true);
      return;
    }

    onAlternarDisponibilidade(true);
  };

  const desconectar = () => {
    if (bloqueado || !disponivel) return;

    onAlternarDisponibilidade(false);
  };

  const MostrarPreferencias = () => {
    setDialogPreferenciasVisibleLocal(true);
  };

  const connectButtonStyle = [
    styles.connectButton,
    disponivel
      ? {
          backgroundColor: "transparent",
          shadowOpacity: 0,
          elevation: 0,
        }
      : {
          backgroundColor: emCorrida ? "#E0E0E0" : "#FFD600",
        },
  ];

  return (
    <>
      <Preferencias
        visible={dialogPreferenciasVisible}
        onClose={() => setDialogPreferenciasVisibleLocal(false)}
        onDisconnect={desconectar}
        buscandoCorrida={disponivel}
      />

      <SafeAreaView
        edges={["bottom"]}
        style={styles.bottomMenuWrapper}
        onLayout={({ nativeEvent }) =>
          onAlturaChange?.(Math.ceil(nativeEvent.layout.height))
        }
      >
        <View style={styles.bottomMenu}>
          {/* 🔹 Ícone lateral esquerdo (Config/Desconectar) */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={MostrarPreferencias}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={32} color="#000" />
            {/* 🔴 Pontinho vermelho de status */}
            <View
              style={[
                styles.redDot,
                { backgroundColor: disponivel ? "#22c55e" : "#E53935" },
              ]}
            />
          </TouchableOpacity>

          {/* 🔹 Botão central "Conectar" / "Buscando" */}
          <TouchableOpacity
            style={connectButtonStyle}
            onPress={alternar}
            disabled={bloqueado}
            activeOpacity={0.9}
          >
            {disponivel ? (
              <Buscando />
            ) : (
              <Text style={styles.connectTextLarge}>
                {emCorrida ? "Em corrida" : ocupado ? "..." : "Conectar"}
              </Text>
            )}
          </TouchableOpacity>

          {/* 🔹 Ícone lateral direito */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={setSolicitacoesCorrida}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={32} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  bottomMenuWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  bottomMenu: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    position: "relative",
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  redDot: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "red",
  },
  connectButton: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
    marginHorizontal: 10,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    minHeight: 60,
  },
  connectTextLarge: {
    color: "black",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
});
