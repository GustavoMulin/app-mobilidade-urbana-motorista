import { Text } from "@/components/common/Texto";
import { useEffect, useState } from "react";
import { Image } from "react-native";

interface Props {
  // imagem do selo: o arquivo enviado na gestão, senão a URL cadastrada; nula = só o emoji
  imagem?: string | null;
  icone: string;
  tamanho?: number;
}

/**
 * Ícone de um selo de avaliação. Usa a imagem quando o selo tem uma; sem imagem,
 * ou se ela não carregar, mostra o emoji.
 */
export default function IconeDoSelo({ imagem, icone, tamanho = 24 }: Props) {
  const [falhou, setFalhou] = useState(false);

  // trocou a imagem (gestão atualizou): tenta de novo
  useEffect(() => setFalhou(false), [imagem]);

  if (imagem && !falhou) {
    return (
      <Image
        source={{ uri: imagem }}
        style={{ width: tamanho, height: tamanho }}
        resizeMode="contain"
        onError={() => setFalhou(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Text style={{ fontSize: tamanho * 0.8 }}>{icone}</Text>;
}
