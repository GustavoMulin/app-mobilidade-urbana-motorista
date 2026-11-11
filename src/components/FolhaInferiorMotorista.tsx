import AcoesNecessarias from "@/components/AcoesNecessarias";
import type { ItemAcao } from "@/domain/acoesNecessarias";
import BannersPublicidade from "@/components/BannersPublicidade";
import { useBannersPublicidade } from "@/hooks/useBannersPublicidade";
import TituloBloqueio from "@/components/TituloBloqueio";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// alça da folha, acima do conteúdo
const ALTURA_ALCA = 24;
// aberta, a folha para quase no topo: abaixo da barra de status e com um
// pouco do mapa à vista
const FOLGA_NO_TOPO = 12;

// 🔹 Definição das props que o componente recebe
interface DriverSearchProps {
  // ✨ NOVO: Callback para notificar o componente pai (Home) sobre a mudança de estado
  onSheetChange: (index: number) => void;
  indiceAnimado: SharedValue<number>;
  alturaMenuInferior: number;
  // com ação na lista o título alterna os avisos e `aviso` (toques no Conectar) pisca em vermelho
  aviso: number;
  acoes: ItemAcao[];
  // quanto a folha fechada sobe acima do menu: a alça ou as ações
  onAlturaAcoes: (altura: number) => void;
}

export default function FolhaInferiorMotorista({
  onSheetChange,
  indiceAnimado,
  alturaMenuInferior,
  aviso,
  acoes,
  onAlturaAcoes,
}: DriverSearchProps) {
  const banners = useBannersPublicidade();
  const [alturaTopo, setAlturaTopo] = useState(0);
  const temAcoes = acoes.length > 0;
  // a lista cresce com as ações, mas a folha fechada não passa da metade da tela
  const alturaComAcoes =
    temAcoes && alturaTopo > 0
      ? Math.min(
          ALTURA_ALCA + alturaTopo,
          Dimensions.get("window").height * 0.5 - alturaMenuInferior,
        )
      : 0;

  // como no 99: fechada, só a alça aparece acima do menu (ou as ações)
  const alturaFechada = alturaComAcoes || ALTURA_ALCA;

  useEffect(() => {
    onAlturaAcoes(alturaFechada);
  }, [alturaFechada, onAlturaAcoes]);

  // snap points: fechada, metade (um terço da tela, como no 99) e aberta
  const snapPoints = useMemo(() => {
    const alturaTela = Dimensions.get("window").height;
    const fechada = alturaMenuInferior + alturaFechada;
    // com muitas ações a folha fechada já é alta: a metade sobe além dela
    return [
      fechada,
      Math.max(alturaTela * 0.34, fechada + alturaTela * 0.2),
      "100%",
    ];
  }, [alturaFechada, alturaMenuInferior]);
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  // com a folha aberta o aviso ficaria fora da vista: ela volta a mostrar as ações
  useEffect(() => {
    if (aviso > 0) sheetRef.current?.snapToIndex(0);
  }, [aviso]);

  return (
    <View className="flex-1 pt-12 px-4">
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        topInset={insets.top + FOLGA_NO_TOPO}
        onChange={onSheetChange}
        // avisa já no início, para o menu do topo sair antes de a folha chegar
        onAnimate={(_, para) => onSheetChange(para)}
        animatedIndex={indiceAnimado}
      >
        {/* rola quando, aberta, os recursos passam da altura da folha */}
        <BottomSheetScrollView contentContainerStyle={styles.conteudo}>
          {temAcoes && (
            <View
              style={styles.topo}
              onLayout={({ nativeEvent }) =>
                setAlturaTopo(Math.ceil(nativeEvent.layout.height))
              }
            >
              {/* some só quando a lista acaba, mesmo com tudo em análise */}
              <TituloBloqueio aviso={aviso} />
              <AcoesNecessarias itens={acoes} />
            </View>
          )}
          {/* os banners cadastrados na Central de Publicidade da gestão; com
              ação pendente a folha mostra só as ações */}
          {!temAcoes && (
            <View style={styles.recursos}>
              <BannersPublicidade banners={banners} />
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  conteudo: { flexGrow: 1, alignItems: "center", paddingHorizontal: 16 },
  // o espaço até os recursos fica aqui: sem ações, eles encostam no topo
  topo: { alignSelf: "stretch", marginBottom: 12 },
  // faixa cinza de borda a borda, como a das ações
  recursos: {
    alignSelf: "stretch",
    flexGrow: 1,
    marginHorizontal: -16,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#F2F3F5",
  },
});
