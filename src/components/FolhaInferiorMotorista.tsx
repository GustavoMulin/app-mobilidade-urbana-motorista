import AcoesNecessarias from "@/components/AcoesNecessarias";
import type { ItemAcao } from "@/domain/acoesNecessarias";
import BannersPublicidade from "@/components/BannersPublicidade";
import { useBannersPublicidade } from "@/hooks/useBannersPublicidade";
import TituloBloqueio from "@/components/TituloBloqueio";
import { useTema } from "@/theme/tema";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/common/Texto";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// alça da folha, acima do conteúdo (com os dois ícones nas pontas)
const ALTURA_ALCA = 48;
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

// Degradê de cima para baixo feito com faixas de opacidade decrescente (o app
// instalado não tem o módulo nativo de gradiente): a cor da marca no topo
// some aos poucos no fundo do tema
const ALTURA_DA_FAIXA = 3;

// mistura a cor do fundo com o branco (tema escuro) ou o preto (tema claro) numa
// cor opaca: faixas opacas encostadas não deixam linhas entre elas
function misturarComFundo(fundo: string, alvo: number, quantidade: number) {
  const canal = (inicio: number) =>
    parseInt(fundo.slice(inicio, inicio + 2), 16);

  return `rgb(${[canal(1), canal(3), canal(5)]
    .map((valor) => Math.round(valor + (alvo - valor) * quantidade))
    .join(", ")})`;
}

// Degradê de cima para baixo no corpo da folha: um tom mais claro (tema
// escuro) ou mais escuro (tema claro) no topo que some até o fundo do tema, sem
// cor da marca. Feito com faixas porque o app instalado não tem o módulo
// nativo de gradiente.
function DegradeDeCima({
  fundo,
  escuro,
  altura,
}: {
  // cor do fundo da folha, em #rrggbb
  fundo: string;
  escuro: boolean;
  altura: number;
}) {
  const intensidade = escuro ? 0.09 : 0.08;
  const alvo = escuro ? 255 : 0;
  const faixas = Math.ceil(altura / ALTURA_DA_FAIXA);

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: altura,
        overflow: "hidden",
      }}
    >
      {Array.from({ length: faixas }, (_, i) => (
        <View
          key={i}
          style={{
            // cada faixa passa 2 pontos por baixo da seguinte: como são opacas, não
            // sobra a linha que a divisão em pixels quebrados deixa entre elas
            height: ALTURA_DA_FAIXA + 2,
            marginBottom: -2,
            backgroundColor: misturarComFundo(
              fundo,
              alvo,
              intensidade * Math.pow(1 - i / (faixas - 1), 1.3),
            ),
          }}
        />
      ))}
    </View>
  );
}

// a alça: o traço no meio e, nas pontas, um ícone de ajustes e um de lista
function AlcaDaFolha({
  escuro,
  corIcone,
}: {
  escuro: boolean;
  corIcone: string;
}) {
  return (
    <View style={styles.alca}>
      <View
        style={[
          styles.alcaTraco,
          { backgroundColor: escuro ? "#6B727D" : "#C9CDD2" },
        ]}
      />
      <View style={[styles.alcaIcone, styles.alcaIconeEsquerda]}>
        <Ionicons name="options-outline" size={32} color={corIcone} />
      </View>
      <View style={[styles.alcaIcone, styles.alcaIconeDireita]}>
        <Ionicons name="list" size={32} color={corIcone} />
      </View>
    </View>
  );
}

export default function FolhaInferiorMotorista({
  onSheetChange,
  indiceAnimado,
  alturaMenuInferior,
  aviso,
  acoes,
  onAlturaAcoes,
}: DriverSearchProps) {
  const { escuro, cores } = useTema();
  const { banners, carregado, carregando, recarregar } =
    useBannersPublicidade();
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
  // a alça com dois ícones nas pontas (ainda sem ação)
  const renderAlca = useCallback(
    () => <AlcaDaFolha escuro={escuro} corIcone={cores.icone} />,
    [escuro, cores.icone],
  );
  const insets = useSafeAreaInsets();

  // sem ação pendente e sem banner (a mensagem "Nada para mostrar"), a folha
  // já começa aberta na metade; só na primeira vez, para não brigar com o arraste
  const nadaParaMostrar = !temAcoes && carregado && banners.length === 0;
  const abriuSemNada = useRef(false);

  useEffect(() => {
    if (!nadaParaMostrar || abriuSemNada.current) return;

    abriuSemNada.current = true;
    sheetRef.current?.snapToIndex(1);
  }, [nadaParaMostrar]);

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
        // branco no modo claro (o resto dos painéis segue a cor do mapa)
        backgroundStyle={{ backgroundColor: escuro ? cores.painel : "#ffffff" }}
        handleComponent={renderAlca}
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
            <View
              style={[
                styles.recursos,
                { backgroundColor: escuro ? cores.painel : "#ffffff" },
              ]}
            >
              {nadaParaMostrar && (
                <DegradeDeCima
                  fundo={escuro ? cores.painel : "#ffffff"}
                  escuro={escuro}
                  altura={320}
                />
              )}
              <BannersPublicidade banners={banners} />
              {/* nada para mostrar: sem ação pendente e sem banner da cidade */}
              {nadaParaMostrar && (
                <View style={styles.vazio}>
                  <Image
                    source={require("../../assets/images/nada-pra-mostrar.png")}
                    style={styles.vazioImagem}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  <Text
                    style={[
                      styles.vazioTexto,
                      { color: escuro ? cores.textoApoio : "#6B7280" },
                    ]}
                  >
                    Nada para mostrar por enquanto
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Recarregar"
                    activeOpacity={0.8}
                    disabled={carregando}
                    onPress={() => void recarregar()}
                    style={[
                      styles.recarregar,
                      { borderColor: escuro ? cores.borda : "#C9CDD2" },
                    ]}
                  >
                    {carregando ? (
                      <ActivityIndicator size="small" color="#FFB800" />
                    ) : (
                      <Text
                        style={[styles.recarregarTexto, { color: cores.icone }]}
                      >
                        Recarregar
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  alca: { height: ALTURA_ALCA, alignItems: "center", paddingTop: 10 },
  alcaTraco: { width: 40, height: 4, borderRadius: 2 },
  alcaIcone: { position: "absolute", top: 8 },
  alcaIconeEsquerda: { left: 16 },
  alcaIconeDireita: { right: 16 },
  vazio: {
    alignItems: "center",
    marginTop: -12,
    paddingBottom: 8,
    gap: 14,
  },
  vazioImagem: { width: 80, height: 80 },
  vazioTexto: { fontSize: 18, textAlign: "center" },
  recarregar: {
    minWidth: 120,
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  recarregarTexto: { fontSize: 15, fontWeight: "600" },
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
  },
});
