import type { BannerPublicidade } from "@/hooks/useBannersPublicidade";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const TROCA_AUTOMATICA_MS = 5000;
// proporção dos banners do painel (largura / altura)
const PROPORCAO = 2.4;

interface Props {
  banners: BannerPublicidade[];
}

export default function BannersPublicidade({ banners }: Props) {
  const [largura, setLargura] = useState(0);
  const [atual, setAtual] = useState(0);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const tocando = useRef(false);

  useEffect(() => {
    if (banners.length < 2 || largura === 0) return;

    const relogio = setInterval(() => {
      if (tocando.current) return;

      setAtual((indice) => {
        const proximo = (indice + 1) % banners.length;
        rolagem.current?.scrollTo({ x: proximo * largura, animated: true });

        return proximo;
      });
    }, TROCA_AUTOMATICA_MS);

    return () => clearInterval(relogio);
  }, [banners.length, largura]);

  if (banners.length === 0) return null;

  const aoParar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    tocando.current = false;
    if (largura === 0) return;

    setAtual(Math.round(evento.nativeEvent.contentOffset.x / largura));
  };

  return (
    <View
      style={styles.container}
      onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
    >
      {largura > 0 && (
        <ScrollView
          ref={rolagem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            tocando.current = true;
          }}
          onMomentumScrollEnd={aoParar}
        >
          {banners.map((banner) => (
            <Image
              key={banner.id}
              source={{ uri: banner.url }}
              style={[styles.imagem, { width: largura }]}
              resizeMode="cover"
              accessibilityRole="image"
              accessibilityLabel={banner.titulo}
            />
          ))}
        </ScrollView>
      )}

      {banners.length > 1 && (
        <View style={styles.pontos} accessibilityElementsHidden>
          {banners.map((banner, indice) => (
            <View
              key={banner.id}
              style={[styles.ponto, indice === atual && styles.pontoAtual]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 14,
  },
  imagem: {
    aspectRatio: PROPORCAO,
    borderRadius: 14,
    backgroundColor: "#F1F2F4",
  },
  pontos: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  pontoAtual: {
    width: 16,
    backgroundColor: "#111827",
  },
});
