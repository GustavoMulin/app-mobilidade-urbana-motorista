import { Image } from "react-native";

interface Props {
  size?: number;
  color?: string;
}

// Material Symbols Outlined "perm_phone_msg" (preenchimento 0, peso 400): o
// telefone com a mensagem, para falar com a outra pessoa da corrida. É uma
// imagem (e não um SVG) porque o app instalado no aparelho não tem o módulo
// nativo do react-native-svg; a cor vem do tintColor.
export default function IconePermPhoneMsg({
  size = 24,
  color = "#111111",
}: Props) {
  return (
    <Image
      source={require("../../assets/perm_phone_msg.png")}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
