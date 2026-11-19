import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Text as TextoFixo,
  StyleSheet,
  View,
} from "react-native";

// valor em reais com os números rolando como no caça-níquel (o mesmo efeito do
// "Ganho da corrida"). Os números só giram quando `giro` muda; fora disso,
// qualquer mudança de valor aparece direto.
interface Props {
  // ex.: "R$ 1.234,56"
  texto: string;
  giro: number;
  fontSize?: number;
  cor?: string;
}

const VOLTAS = 3;
const DIGITOS = Array.from({ length: 10 * VOLTAS }, (_, i) => i % 10);
const GIRO_MS = 650;
const ATRASO_ENTRE_ROLOS_MS = 110;

function Rolo({
  digito,
  giro,
  ordem,
  altura,
  estilo,
}: {
  digito: number;
  giro: number;
  ordem: number;
  altura: number;
  estilo: object;
}) {
  // posição em linhas (não em pixels): mudar o tamanho do texto não desalinha o rolo
  const [posicao] = useState(() => new Animated.Value(digito));
  const anterior = useRef({ digito, giro });

  useEffect(() => {
    const antes = anterior.current;

    if (antes.digito === digito && antes.giro === giro) return;

    anterior.current = { digito, giro };

    // sem giro pedido: só mostra o número novo
    if (antes.giro === giro) {
      posicao.setValue(digito);
      return;
    }

    // parte do número que estava e para na última volta, cada rolo um pouco
    // depois do anterior
    posicao.setValue(antes.digito);
    const animacao = Animated.timing(posicao, {
      toValue: 10 * (VOLTAS - 1) + digito,
      duration: GIRO_MS + ordem * ATRASO_ENTRE_ROLOS_MS,
      delay: 120,
      easing: Easing.out(Easing.back(0.6)),
      useNativeDriver: true,
    });

    animacao.start();

    return () => animacao.stop();
  }, [posicao, digito, giro, ordem]);

  return (
    <View style={{ height: altura, overflow: "hidden", width: altura * 0.6 }}>
      <Animated.View
        style={{
          transform: [{ translateY: Animated.multiply(posicao, -altura) }],
        }}
      >
        {DIGITOS.map((numero, indice) => (
          <TextoFixo
            key={indice}
            allowFontScaling={false}
            style={[estilo, { height: altura, lineHeight: altura }]}
          >
            {numero}
          </TextoFixo>
        ))}
      </Animated.View>
    </View>
  );
}

export default function ValorRolante({
  texto,
  giro,
  fontSize = 19,
  cor = "#FFF",
}: Props) {
  const altura = Math.round(fontSize * 1.3);
  const estilo = { color: cor, fontSize, fontWeight: "800" as const };
  const caracteres = texto.split("");
  const totalDeDigitos = caracteres.filter((c) => /\d/.test(c)).length;
  let digitoAtual = 0;

  return (
    <View
      style={styles.linha}
      accessible
      accessibilityLabel={texto}
      importantForAccessibility="yes"
    >
      {caracteres.map((caractere, indice) => {
        if (!/\d/.test(caractere)) {
          return (
            <TextoFixo
              key={`s${caracteres.length - indice}`}
              allowFontScaling={false}
              style={[estilo, { lineHeight: altura }]}
            >
              {caractere === " " ? " " : caractere}
            </TextoFixo>
          );
        }

        const ordem = digitoAtual++;

        // a chave conta a partir da direita: com um dígito a mais, os que já
        // existiam seguem os mesmos rolos
        return (
          <Rolo
            key={`d${totalDeDigitos - ordem}`}
            digito={Number(caractere)}
            giro={giro}
            ordem={ordem}
            altura={altura}
            estilo={estilo}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center" },
});
