import { corDoVeiculo } from "@/domain/corVeiculo";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

const LINHA = "#14181D";
const contorno = { stroke: LINHA, strokeOpacity: 0.55, strokeWidth: 1.5 };

function Roda({ x, y, raio }: { x: number; y: number; raio: number }) {
  return (
    <>
      <Circle cx={x} cy={y} r={raio} fill="#1F2327" />
      <Circle cx={x} cy={y} r={raio * 0.56} fill="#C9CED3" />
      <Circle cx={x} cy={y} r={raio * 0.2} fill="#6B7280" />
    </>
  );
}

function Moto({ cor }: { cor: string }) {
  return (
    <>
      <Ellipse cx={160} cy={124} rx={136} ry={5} fill="#000" opacity={0.12} />
      <Path
        d="M186 84L250 96"
        stroke="#3A4048"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M170 104C200 106 240 98 274 78"
        stroke="#9AA1A9"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
      <Roda x={66} y={96} raio={28} />
      <Roda x={250} y={96} raio={28} />
      <Path
        d="M66 96L112 30"
        stroke="#3A4048"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M112 30L96 18"
        stroke={LINHA}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Path
        d="M112 42L134 84L188 84L190 56"
        stroke="#3A4048"
        strokeWidth={8}
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={126} y={68} width={60} height={36} rx={8} fill="#4B5158" />
      <Path
        d="M136 76L176 76M136 86L176 86M136 96L176 96"
        stroke="#2B3036"
        strokeWidth={2.5}
      />
      <Circle cx={94} cy={50} r={10} fill="#FFF3B0" {...contorno} />
      <Path
        d="M36 88A31 31 0 0 1 94 80L86 86A23 23 0 0 0 44 92Z"
        fill={cor}
        {...contorno}
      />
      <Path
        d="M186 60L262 54L290 42L284 56C264 70 222 76 192 76Z"
        fill={cor}
        {...contorno}
      />
      <Path d="M186 46C206 40 240 42 268 50L262 56L188 62Z" fill="#1F2327" />
      <Path
        d="M112 46C130 28 172 26 190 44L194 64C170 72 132 72 114 66Z"
        fill={cor}
        {...contorno}
      />
      <Path
        d="M120 44C136 34 166 33 182 44C160 40 140 41 120 44Z"
        fill="#FFF"
        opacity={0.25}
      />
      <Path d="M284 45L296 40L291 52L282 56Z" fill="#D32F2F" />
    </>
  );
}

// A máscara da carroceria recebe a cor; por cima vão as sombras, os reflexos e o
// que não é pintura (vidros, rodas, farol). As duas camadas têm o mesmo tamanho.
function Carro({ cor, style }: { cor: string; style?: StyleProp<ViewStyle> }) {
  // a máscara é mais leve e carrega antes: sozinha ela vira uma silhueta da cor do carro
  const [pinturaPronta, setPinturaPronta] = useState(false);
  const [detalhesProntos, setDetalhesProntos] = useState(false);

  return (
    <View style={[style, !(pinturaPronta && detalhesProntos) && s.oculto]}>
      <Image
        source={require("../../../assets/images/cadastro-veiculo/carro-pintura.png")}
        style={[StyleSheet.absoluteFill, s.camada, { tintColor: cor }]}
        resizeMode="contain"
        onLoad={() => setPinturaPronta(true)}
      />
      <Image
        source={require("../../../assets/images/cadastro-veiculo/carro-detalhes.png")}
        style={[StyleSheet.absoluteFill, s.camada]}
        resizeMode="contain"
        onLoad={() => setDetalhesProntos(true)}
      />
    </View>
  );
}

export default function VeiculoColorido({
  categoria,
  cor,
  style,
}: {
  categoria: "carro" | "moto";
  cor?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const pintura = corDoVeiculo(cor);

  if (categoria === "carro") return <Carro cor={pintura} style={style} />;

  return (
    <Svg viewBox="0 0 320 130" style={style}>
      <Moto cor={pintura} />
    </Svg>
  );
}

const s = StyleSheet.create({
  camada: { width: "100%", height: "100%" },
  oculto: { opacity: 0 },
});
