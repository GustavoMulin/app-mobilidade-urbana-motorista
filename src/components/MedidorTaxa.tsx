import { Text } from "@/components/common/Texto";
import {
  COR_ABAIXO,
  COR_ACIMA,
  COR_TRANSICAO,
  ANGULO_INICIAL,
  ANGULO_TOTAL,
  anguloDoValor,
  polar,
} from "@/domain/taxaFinalizacao";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

interface Props {
  taxa: number;
  // com mínimo o arco é vermelho/laranja/verde e leva a seta do mínimo; sem
  // mínimo (aceitação) o arco é de progresso: verde até a taxa, cinza depois
  minima?: number | null;
}

// o desenho é feito num quadro fixo e escalado para a largura da tela
const LARGURA = 360;
const ALTURA = 230;
const CX = LARGURA / 2;
const CY = 150;
const RAIO = 110;
const ESPESSURA = 22;
const RAIO_INTERNO = 88;
const ESPESSURA_TRILHO = 3;
// graus por peça do arco; peças pequenas e sobrepostas parecem um traço contínuo
const PASSO_ARCO = 2;
const PASSO_TRILHO = 3;
// faixa laranja de transição centrada no mínimo, em pontos percentuais
const FOLGA_DA_FAIXA = 2;
const COR_VAZIA = "#E8E8E8";

interface Peca {
  chave: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  angulo: number;
  cor: string;
}

/**
 * Arco feito de retângulos pequenos girados ao longo da curva, sem depender de
 * módulo nativo de desenho (o app roda no Expo Go, que nem sempre tem SVG).
 */
function pecasDoArco(
  raio: number,
  espessura: number,
  passo: number,
  corDoValor: (valor: number) => string,
): Peca[] {
  const comprimento = ((passo * Math.PI) / 180) * raio + 1.5;
  const pecas: Peca[] = [];

  for (let inicio = 0; inicio < ANGULO_TOTAL; inicio += passo) {
    const meio = ANGULO_INICIAL + inicio + passo / 2;
    const ponto = polar(CX, CY, raio, meio);

    pecas.push({
      chave: `${raio}-${inicio}`,
      x: ponto.x - comprimento / 2,
      y: ponto.y - espessura / 2,
      largura: comprimento,
      altura: espessura,
      // a peça mede o comprimento no eixo x; a tangente do arco é meio + 90°
      angulo: meio + 90,
      cor: corDoValor(((inicio + passo / 2) / ANGULO_TOTAL) * 100),
    });
  }

  return pecas;
}

/**
 * Medidor de taxa (finalização e aceitação): arco grosso, anel interno fino e
 * o ponteiro da taxa atual por dentro. Com mínimo, a seta do mínimo por fora.
 */
export default function MedidorTaxa({ taxa, minima = null }: Props) {
  const [largura, setLargura] = useState(0);
  const escala = largura / LARGURA;
  const comMinima = minima !== null;

  const arco = useMemo(
    () =>
      pecasDoArco(RAIO, ESPESSURA, PASSO_ARCO, (valor) => {
        if (minima === null) return valor <= taxa ? COR_ACIMA : COR_VAZIA;
        if (valor < minima - FOLGA_DA_FAIXA) return COR_ABAIXO;
        if (valor <= minima + FOLGA_DA_FAIXA) return COR_TRANSICAO;
        return COR_ACIMA;
      }),
    [minima, taxa],
  );
  const trilho = useMemo(
    () =>
      pecasDoArco(
        RAIO_INTERNO,
        ESPESSURA_TRILHO,
        PASSO_TRILHO,
        () => "#DCDCDC",
      ),
    [],
  );

  const aTaxa = anguloDoValor(taxa);
  const pontaDoArco = polar(CX, CY, RAIO, anguloDoValor(0));
  const fimDoArco = polar(CX, CY, RAIO, anguloDoValor(100));
  const corDaPontaInicial = comMinima
    ? COR_ABAIXO
    : taxa > 0
      ? COR_ACIMA
      : COR_VAZIA;
  const corDaPontaFinal = comMinima || taxa >= 100 ? COR_ACIMA : COR_VAZIA;
  const ponteiro = polar(CX, CY, RAIO_INTERNO - 2, aTaxa);

  // seta do mínimo: haste por fora do arco e a ponta apontando para a faixa
  const aMinimo = comMinima ? anguloDoValor(minima) : 0;
  const haste = polar(CX, CY, RAIO + 30, aMinimo);
  const ponta = polar(CX, CY, RAIO + 19, aMinimo);
  const rotulo = polar(CX, CY, RAIO + 42, aMinimo);
  const rotuloNaEsquerda = rotulo.x < CX;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        comMinima ? `Taxa de ${taxa}%, mínimo ${minima}%` : `Taxa de ${taxa}%`
      }
      onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
      style={styles.caixa}
    >
      {largura > 0 ? (
        <View
          style={[styles.quadro, { transform: [{ scale: escala }] }]}
          pointerEvents="none"
        >
          {trilho.map((peca) => (
            <View
              key={peca.chave}
              style={[
                styles.peca,
                {
                  left: peca.x,
                  top: peca.y,
                  width: peca.largura,
                  height: peca.altura,
                  backgroundColor: peca.cor,
                  transform: [{ rotate: `${peca.angulo}deg` }],
                },
              ]}
            />
          ))}
          {arco.map((peca) => (
            <View
              key={peca.chave}
              style={[
                styles.peca,
                {
                  left: peca.x,
                  top: peca.y,
                  width: peca.largura,
                  height: peca.altura,
                  backgroundColor: peca.cor,
                  transform: [{ rotate: `${peca.angulo}deg` }],
                },
              ]}
            />
          ))}
          {/* pontas arredondadas só nas extremidades do arco */}
          <View
            style={[
              styles.ponta,
              {
                left: pontaDoArco.x - ESPESSURA / 2,
                top: pontaDoArco.y - ESPESSURA / 2,
                backgroundColor: corDaPontaInicial,
              },
            ]}
          />
          <View
            style={[
              styles.ponta,
              {
                left: fimDoArco.x - ESPESSURA / 2,
                top: fimDoArco.y - ESPESSURA / 2,
                backgroundColor: corDaPontaFinal,
              },
            ]}
          />

          {comMinima ? (
            <>
              <View
                style={[
                  styles.haste,
                  {
                    left: haste.x - 1.5,
                    top: haste.y - 9,
                    transform: [{ rotate: `${aMinimo + 90}deg` }],
                  },
                ]}
              />
              <View
                style={[
                  styles.triangulo,
                  {
                    left: ponta.x - 7,
                    top: ponta.y - 8,
                    // a ponta do triângulo aponta para dentro do arco
                    transform: [{ rotate: `${aMinimo - 90}deg` }],
                  },
                ]}
              />
              <View
                style={[
                  styles.rotulo,
                  rotuloNaEsquerda
                    ? { left: rotulo.x - 80, alignItems: "flex-end" }
                    : {
                        // o texto cresce para a direita: não deixa sair do quadro
                        left: Math.min(rotulo.x, LARGURA - 64),
                        alignItems: "flex-start",
                      },
                  { top: rotulo.y - 18 },
                ]}
              >
                <Text style={styles.rotuloTexto}>Mínimo</Text>
                <Text style={styles.rotuloTexto}>{minima}%</Text>
              </View>
            </>
          ) : null}

          {/* ponteiro da taxa atual, no anel interno apontando para o arco */}
          <View
            style={[
              styles.triangulo,
              {
                left: ponteiro.x - 7,
                top: ponteiro.y - 8,
                transform: [{ rotate: `${aTaxa + 90}deg` }],
              },
            ]}
          />

          <View style={styles.centro}>
            <Text style={styles.valor}>
              {taxa}
              <Text style={styles.simbolo}>%</Text>
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    width: "100%",
    aspectRatio: LARGURA / ALTURA,
  },
  // escala a partir do canto superior esquerdo, para ocupar a largura da caixa
  quadro: {
    width: LARGURA,
    height: ALTURA,
    transformOrigin: "top left",
  },
  peca: { position: "absolute" },
  ponta: {
    position: "absolute",
    width: ESPESSURA,
    height: ESPESSURA,
    borderRadius: ESPESSURA / 2,
  },
  haste: {
    position: "absolute",
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "#111",
  },
  // triângulo por bordas: sem rotação a ponta aponta para cima
  triangulo: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#111",
  },
  rotulo: { position: "absolute", width: 80 },
  rotuloTexto: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "bold",
    color: "#111",
  },
  centro: {
    position: "absolute",
    left: 0,
    width: LARGURA,
    top: CY - 50,
    alignItems: "center",
  },
  valor: { fontSize: 64, fontWeight: "bold", color: "#222" },
  simbolo: { fontSize: 32, fontWeight: "bold", color: "#222" },
});
