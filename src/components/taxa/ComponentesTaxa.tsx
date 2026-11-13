import { Text } from "@/components/common/Texto";
import {
  ALTURA_BARRA,
  ALTURA_ROTULO,
  FOLGA_BARRA,
  LARGURA_BARRA,
  LARGURA_EIXO,
  TOPO_BALAO,
  estilosTaxa as styles,
} from "@/components/taxa/estilosTaxa";
import {
  COR_ACIMA,
  corDaTaxa,
  rotuloDia,
  rotuloDiaCurto,
  type PontoDiario,
} from "@/domain/taxaFinalizacao";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, type ComponentRef, type ReactNode } from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";

export type Aba = "corridas" | "entregas";

export function Abas({
  aba,
  onChange,
}: {
  aba: Aba;
  onChange: (aba: Aba) => void;
}) {
  return (
    <View style={styles.abas}>
      {(
        [
          ["corridas", "Corridas"],
          ["entregas", "Entregas"],
        ] as const
      ).map(([valor, rotulo]) => (
        <TouchableOpacity
          key={valor}
          accessibilityRole="tab"
          accessibilityState={{ selected: aba === valor }}
          onPress={() => onChange(valor)}
          style={[styles.aba, aba === valor && styles.abaAtiva]}
        >
          <Text
            style={[styles.abaTexto, aba === valor && styles.abaTextoAtiva]}
          >
            {rotulo}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Bloco com título que abre e fecha (títulos grandes de seção ou itens de FAQ). */
export function Secao({
  titulo,
  aberta,
  onAlternar,
  children,
  grande = false,
}: {
  titulo: string;
  aberta: boolean;
  onAlternar: () => void;
  children: ReactNode;
  grande?: boolean;
}) {
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        onPress={onAlternar}
        style={styles.secaoCabecalho}
      >
        <Text style={grande ? styles.tituloSecao : styles.tituloItem}>
          {titulo}
        </Text>
        <Ionicons
          name={aberta ? "chevron-up" : "chevron-down"}
          size={20}
          color="#888"
        />
      </TouchableOpacity>
      {aberta ? children : null}
    </View>
  );
}

export function Chips<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: readonly (readonly [T, string])[];
  valor: T;
  onChange: (valor: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {opcoes.map(([chave, rotulo]) => (
        <TouchableOpacity
          key={chave}
          accessibilityRole="button"
          accessibilityState={{ selected: valor === chave }}
          onPress={() => onChange(chave)}
          style={[styles.chip, valor === chave && styles.chipAtivo]}
        >
          <Text
            style={[styles.chipTexto, valor === chave && styles.chipTextoAtivo]}
          >
            {rotulo}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ItemDeHistorico({
  rotulo,
  detalhe,
  valor,
}: {
  rotulo: string;
  detalhe?: string;
  valor: string;
}) {
  return (
    <View style={styles.itemHistorico}>
      <View>
        <Text style={styles.itemHistoricoRotulo}>{rotulo}</Text>
        {detalhe ? (
          <Text style={styles.itemHistoricoDetalhe}>{detalhe}</Text>
        ) : null}
      </View>
      <Text style={styles.itemHistoricoValor}>{valor}</Text>
    </View>
  );
}

export function LinhaDeContagem({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: number;
}) {
  return (
    <View style={styles.linhaContagem}>
      <Text style={styles.contagemRotulo}>{rotulo}</Text>
      <Text style={styles.contagemValor}>{valor}</Text>
    </View>
  );
}

/**
 * Barras dos últimos dias, com rolagem na horizontal. Com `minima` a barra
 * escolhida fica vermelha abaixo dela e há uma linha tracejada no mínimo; sem
 * `minima` (aceitação) só há o eixo de 0% a 100%.
 */
export function GraficoDiario({
  dias,
  minima = null,
  selecionado,
  onSelecionar,
}: {
  dias: PontoDiario[];
  minima?: number | null;
  selecionado: number;
  onSelecionar: (indice: number) => void;
}) {
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const alturaTotal = TOPO_BALAO + ALTURA_BARRA + ALTURA_ROTULO;
  const topoDaMinima =
    minima === null ? 0 : TOPO_BALAO + (1 - minima / 100) * ALTURA_BARRA;

  return (
    <View style={[styles.grafico, { height: alturaTotal }]}>
      <ScrollView
        ref={rolagem}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginRight: LARGURA_EIXO }}
        onContentSizeChange={() =>
          rolagem.current?.scrollToEnd({ animated: false })
        }
      >
        {dias.map((dia, indice) => {
          const ativo = indice === selecionado;
          const altura =
            dia.taxa === null
              ? 0
              : Math.max(4, (dia.taxa / 100) * ALTURA_BARRA);
          const corAtiva =
            minima === null ? COR_ACIMA : corDaTaxa(dia.taxa ?? 100, minima);

          return (
            <Pressable
              key={dia.data}
              accessibilityRole="button"
              accessibilityLabel={`${rotuloDia(dia.data)}: ${
                dia.taxa === null ? "sem corridas" : `${dia.taxa}%`
              }`}
              onPress={() => onSelecionar(indice)}
              style={[styles.coluna, { width: LARGURA_BARRA + FOLGA_BARRA }]}
            >
              <View style={styles.areaDaBarra}>
                {ativo && dia.taxa !== null ? (
                  <View
                    style={[styles.balao, { bottom: altura + 8 }]}
                    pointerEvents="none"
                  >
                    <Text style={styles.balaoTexto}>
                      {dia.taxa}
                      <Text style={styles.balaoSimbolo}>%</Text>
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    width: LARGURA_BARRA,
                    height: altura,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                    backgroundColor: ativo ? corAtiva : "#F0F0F0",
                  }}
                />
              </View>
              <Text style={[styles.rotuloDoDia, ativo && styles.rotuloAtivo]}>
                {rotuloDiaCurto(dia.data)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {minima === null ? null : (
        <View
          pointerEvents="none"
          style={[styles.linhaMinima, { top: topoDaMinima }]}
        />
      )}
      <View pointerEvents="none" style={styles.eixo}>
        <Text style={[styles.eixoTexto, { top: TOPO_BALAO - 8 }]}>100%</Text>
        {minima === null ? null : (
          <Text
            style={[
              styles.eixoTexto,
              { top: topoDaMinima - 8, color: COR_ACIMA },
            ]}
          >
            {minima}%
          </Text>
        )}
        <Text
          style={[styles.eixoTexto, { top: TOPO_BALAO + ALTURA_BARRA - 8 }]}
        >
          0%
        </Text>
      </View>
    </View>
  );
}
