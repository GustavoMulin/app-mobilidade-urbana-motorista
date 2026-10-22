import BannersPublicidade from "@/components/BannersPublicidade";
import { useAuth } from "@/context/AuthProvider";
import { useBannersPublicidade } from "@/hooks/useBannersPublicidade";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef } from "react";
import { Text } from "@/components/common/Texto";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

// 🔹 Definição das props que o componente recebe
interface DriverSearchProps {
  // ✨ NOVO: Callback para notificar o componente pai (Home) sobre a mudança de estado
  onSheetChange: (index: number) => void;
  indiceAnimado: SharedValue<number>;
}

export default function FolhaInferiorMotorista({
  onSheetChange,
  indiceAnimado,
}: DriverSearchProps) {
  const { user } = useAuth();
  const banners = useBannersPublicidade();
  // snap points do bottomsheet
  const snapPoints = useMemo(() => ["18%", "52%", "92%"], []);
  const sheetRef = useRef<BottomSheet>(null);

  // eventos
  const handleSheetChange = useCallback(
    (index: number) => {
      // ✨ CHAMANDO CALLBACK: Notifica o componente pai sobre o índice atual
      onSheetChange(index);
    },
    [onSheetChange],
  );

  return (
    <View className="flex-1 pt-12 px-4">
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        onChange={handleSheetChange}
        animatedIndex={indiceAnimado}
      >
        {/* Campo de pesquisa */}
        <BottomSheetView className="flex-1 items-center px-4">
          <Text maxFontSizeMultiplier={1.1} style={styles.saudacao}>
            Olá, {user?.name?.split(/\s+/)[0]}!
          </Text>
          <BannersPublicidade banners={banners} />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  saudacao: {
    color: "#222222",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
});
