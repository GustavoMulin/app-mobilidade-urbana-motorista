import { Image, StyleSheet } from "react-native";

// Ilustrações extraídas da referência fornecida, disponíveis sem rede.
const fisicos = [
  require("../../../assets/images/cadastro-veiculo/fisico-erro-1.png"),
  require("../../../assets/images/cadastro-veiculo/fisico-erro-2.png"),
  require("../../../assets/images/cadastro-veiculo/fisico-erro-3.png"),
  require("../../../assets/images/cadastro-veiculo/fisico-erro-4.png"),
];
const digitais = [
  require("../../../assets/images/cadastro-veiculo/digital-erro-1.png"),
  require("../../../assets/images/cadastro-veiculo/digital-erro-2.png"),
  require("../../../assets/images/cadastro-veiculo/digital-erro-3.png"),
  require("../../../assets/images/cadastro-veiculo/digital-erro-4.png"),
];

export function IlustracaoDocumento({
  digital = false,
}: {
  digital?: boolean;
}) {
  return (
    <Image
      source={
        digital
          ? require("../../../assets/images/cadastro-veiculo/crlv-digital.png")
          : require("../../../assets/images/cadastro-veiculo/crlv-fisico.png")
      }
      style={s.imagem}
      resizeMode="contain"
      accessible={false}
    />
  );
}

export function IlustracaoErro({
  digital,
  indice,
}: {
  digital: boolean;
  indice: number;
}) {
  return (
    <Image
      source={(digital ? digitais : fisicos)[indice]}
      style={s.imagem}
      resizeMode="cover"
      accessible={false}
    />
  );
}

const s = StyleSheet.create({ imagem: { width: "100%", height: "100%" } });
