import { Text } from "@/components/common/Texto";
import { useState } from "react";
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
  // guarda QUAL endereço falhou: se a gestão trocar a imagem, a nova é tentada
  const [enderecoComFalha, setEnderecoComFalha] = useState<string | null>(null);

  if (imagem && imagem !== enderecoComFalha) {
    return (
      <Image
        source={{ uri: imagem }}
        style={{ width: tamanho, height: tamanho }}
        resizeMode="contain"
        onError={() => setEnderecoComFalha(imagem)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return <Text style={{ fontSize: tamanho * 0.8 }}>{icone}</Text>;
}
