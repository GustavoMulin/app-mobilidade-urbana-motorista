import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Text } from "@/components/common/Texto";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

// ==========================================================
// 💡 Lógica de Cálculo das Ofertas
// ==========================================================
const calcularOfertas = (valorBase: number, percentualNegociacao: number) => {
  const AUMENTO_POR_DEGRAU = 0.05; // 5% de aumento por degrau
  const fatorMaximo = 1 + percentualNegociacao / 100;
  const valorMaximo = valorBase * fatorMaximo;
  const fatorAumento = valorMaximo / valorBase;
  const n = (fatorAumento - 1) / AUMENTO_POR_DEGRAU;
  const numDegraus = Math.ceil(n);
  const ofertas: number[] = [];

  for (let i = numDegraus; i >= 1; i--) {
    const valorOferta = valorBase * (1 + i * AUMENTO_POR_DEGRAU);
    ofertas.push(parseFloat(valorOferta.toFixed(2)));
  }

  const uniqueOfertas = Array.from(new Set(ofertas));
  if (numDegraus * AUMENTO_POR_DEGRAU < percentualNegociacao / 100) {
    const maxCalc = parseFloat(valorMaximo.toFixed(2));
    if (uniqueOfertas.length === 0 || uniqueOfertas[0] < maxCalc) {
      uniqueOfertas.unshift(maxCalc);
    }
  }
  return uniqueOfertas;
};

// 🔹 Props
interface NegociarChamadaProps {
  valorBase: number;
  onValorEscolhido: (valor: number) => void;
  percentualNegociacao?: number;
  // fundo claro (lista de solicitações); o padrão é o cartão escuro da chamada
  claro?: boolean;
}

const NegociarChamada = ({
  valorBase,
  onValorEscolhido,
  percentualNegociacao = 40,
  claro = false,
}: NegociarChamadaProps) => {
  const [valorEscolhido, setValorEscolhido] = useState<number | null>(null);
  // do degrau mais perto da oferta do passageiro para o mais alto, sem
  // nenhum destacado (a maior em primeiro e marcada parecia já escolhida)
  const ofertas = useMemo(
    () =>
      [...calcularOfertas(valorBase, percentualNegociacao)].sort(
        (a, b) => a - b,
      ),
    [valorBase, percentualNegociacao],
  );

  const handleSelecionarOferta = (valor: number) => {
    if (valorEscolhido) return;
    setValorEscolhido(valor);
    onValorEscolhido(valor);
  };

  return (
    <View style={[styles.container, claro && styles.containerClaro]}>
      <View style={styles.tituloContainer}>
        <Ionicons name="cash-outline" size={20} color="#fbc02d" />
        <Text style={[styles.tituloTexto, claro && styles.tituloTextoClaro]}>
          Ou proponha outro valor
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {ofertas.map((valor, index) => {
          const isSelected = valorEscolhido === valor;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.botaoOferta,
                styles.bordaNormal,
                isSelected
                  ? styles.botaoSelecionado
                  : claro
                    ? styles.botaoPadraoClaro
                    : styles.botaoPadrao,
                valorEscolhido ? styles.botaoDesativado : null,
              ]}
              onPress={() => handleSelecionarOferta(valor)}
              disabled={!!valorEscolhido}
            >
              <Text
                style={[
                  styles.textoBotao,
                  claro && styles.textoBotaoClaro,
                  isSelected ? styles.textoSelecionado : null,
                ]}
              >
                R$ {valor.toFixed(2).replace(".", ",")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ==========================================================
// 🎨 Estilos
// ==========================================================
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
  },
  containerClaro: { paddingHorizontal: 0, marginBottom: 0 },
  tituloTextoClaro: { color: "#444" },
  botaoPadraoClaro: {
    backgroundColor: "#F4F5F7",
    borderColor: "#E2E4E8",
    shadowOpacity: 0,
  },
  textoBotaoClaro: { color: "#111" },
  tituloContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tituloTexto: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  scrollContainer: {
    paddingVertical: 4,
  },
  botaoOferta: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  bordaNormal: {
    borderWidth: 1,
    borderColor: "#666",
  },
  botaoPadrao: {
    backgroundColor: "#444",
  },
  botaoSelecionado: {
    backgroundColor: "#fbc02d",
    transform: [{ scale: 1.05 }],
  },
  botaoDesativado: {
    opacity: 0.7,
  },
  textoBotao: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  textoSelecionado: {
    color: "#222",
    fontWeight: "800",
  },
});

export default NegociarChamada;
