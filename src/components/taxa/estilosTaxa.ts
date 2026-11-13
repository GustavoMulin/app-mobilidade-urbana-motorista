import { StyleSheet } from "react-native";

// altura do gráfico diário, usada também pelo componente do gráfico
export const ALTURA_BARRA = 150;
export const LARGURA_BARRA = 40;
export const FOLGA_BARRA = 28;
export const TOPO_BALAO = 34;
export const ALTURA_ROTULO = 26;
export const LARGURA_EIXO = 54;

/** Estilos das telas Taxa de Finalização e Taxa de Aceitação. */
export const estilosTaxa = StyleSheet.create({
  centralizado: { paddingVertical: 60, alignItems: "center" },
  erro: { color: "#B3261E", fontSize: 14, textAlign: "center" },
  vazio: {
    textAlign: "center",
    color: "#777",
    fontSize: 14,
    paddingVertical: 60,
  },

  abas: { flexDirection: "row", gap: 28, marginTop: 8, marginBottom: 20 },
  aba: {
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderColor: "transparent",
  },
  abaAtiva: { borderColor: "#FFB800" },
  abaTexto: { fontSize: 22, color: "#333" },
  abaTextoAtiva: { fontWeight: "600" },

  tituloPagina: { fontSize: 24, fontWeight: "bold", color: "#222" },
  periodo: { fontSize: 16, color: "#888", marginTop: 4, marginBottom: 18 },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: "#FDECEA",
  },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: "#B3261E" },

  cartao: {
    backgroundColor: "#fff",
    borderRadius: 26,
    padding: 18,
    marginBottom: 18,
  },
  mensagem: {
    backgroundColor: "#F4F4F6",
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
    marginBottom: 14,
  },
  mensagemTexto: { fontSize: 17, lineHeight: 25, color: "#222" },
  linhaContagem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  contagemRotulo: { fontSize: 17, color: "#222" },
  contagemValor: { fontSize: 17, fontWeight: "bold", color: "#222" },

  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  tituloSecao: { flex: 1, fontSize: 24, fontWeight: "bold", color: "#222" },
  tituloSolto: { marginTop: 6, marginBottom: 12 },
  tituloItem: { flex: 1, fontSize: 18, color: "#222" },
  explicacao: {
    fontSize: 16,
    lineHeight: 24,
    color: "#777",
    paddingBottom: 10,
  },

  grafico: { marginBottom: 12 },
  coluna: { alignItems: "center" },
  areaDaBarra: {
    height: TOPO_BALAO + ALTURA_BARRA,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  balao: {
    position: "absolute",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  balaoTexto: { fontSize: 20, fontWeight: "bold", color: "#111" },
  balaoSimbolo: { fontSize: 13, fontWeight: "bold", color: "#111" },
  rotuloDoDia: {
    height: ALTURA_ROTULO,
    paddingTop: 6,
    fontSize: 14,
    color: "#888",
  },
  rotuloAtivo: { color: "#111", fontWeight: "600" },
  linhaMinima: {
    position: "absolute",
    left: 0,
    right: LARGURA_EIXO,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#18C27A",
  },
  eixo: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: LARGURA_EIXO,
  },
  eixoTexto: {
    position: "absolute",
    right: 0,
    fontSize: 15,
    color: "#888",
  },

  chips: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#ECECEE",
  },
  chipAtivo: { backgroundColor: "#FFE9B8" },
  chipTexto: { fontSize: 17, color: "#444" },
  chipTextoAtivo: { color: "#B07A00", fontWeight: "600" },
  itemHistorico: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 22,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DDD",
  },
  itemHistoricoRotulo: { fontSize: 17, color: "#222" },
  itemHistoricoDetalhe: { fontSize: 13, color: "#888", marginTop: 2 },
  itemHistoricoValor: { fontSize: 17, fontWeight: "bold", color: "#222" },
});
