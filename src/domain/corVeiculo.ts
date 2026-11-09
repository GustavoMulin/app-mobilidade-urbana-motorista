// Cores do CRLV (COR PREDOMINANTE) e o masculino digitado no cadastro de veículo.
const CORES: Record<string, string> = {
  AMARELA: "#F2C230",
  AMARELO: "#F2C230",
  AZUL: "#1E5AA8",
  BEGE: "#D8C6A5",
  BRANCA: "#F7F7F7",
  BRANCO: "#F7F7F7",
  CINZA: "#7A7F85",
  DOURADA: "#C9A227",
  DOURADO: "#C9A227",
  GRENA: "#6E1A2B",
  VINHO: "#6E1A2B",
  LARANJA: "#E8701A",
  MARROM: "#6D4C41",
  PRATA: "#B9BEC4",
  PRATEADA: "#B9BEC4",
  PRATEADO: "#B9BEC4",
  PRETA: "#111111",
  PRETO: "#111111",
  ROSA: "#E57FA2",
  ROXA: "#6A3D9A",
  ROXO: "#6A3D9A",
  VERDE: "#2E7D32",
  VERMELHA: "#C62828",
  VERMELHO: "#C62828",
};

// FANTASIA, cor vazia ou desconhecida
export const COR_PADRAO = "#B9BEC4";

// a primeira palavra conhecida decide: "Cinza escuro", "AZUL MARINHO", " preto "
export const corDoVeiculo = (cor?: string | null): string =>
  (cor ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .map((palavra) => CORES[palavra])
    .find(Boolean) ?? COR_PADRAO;
