import SelosParaEscolher from "@/components/avaliacao/SelosParaEscolher";
import { alternarSelo, podeEscolherSelos } from "@/domain/avaliacao";
import { enderecoCurto } from "@/domain/endereco";
import { CorridaParaAvaliar } from "@/hooks/useAvaliacaoPendente";
import { useSelosAvaliacao } from "@/hooks/useSelosAvaliacao";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text } from "@/components/common/Texto";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  corrida: CorridaParaAvaliar;
  enviando: boolean;
  // o motorista avalia com nota e selos; só o passageiro escreve comentário
  onAvaliar: (nota: number, elogios: string[]) => void;
  // bloqueia o passageiro; devolve se deu certo
  onBloquear: () => Promise<boolean>;
  onDispensar: () => void;
}

const ESTRELAS = [1, 2, 3, 4, 5];

const formatarValor = (valor?: string | number | null) => {
  const numero = typeof valor === "string" ? Number(valor) : valor;

  if (numero === null || numero === undefined || Number.isNaN(numero)) {
    return null;
  }

  return `R$ ${numero.toFixed(2).replace(".", ",")}`;
};

const formatarKm = (valor?: string | number | null) => {
  const numero = typeof valor === "string" ? Number(valor) : valor;

  if (numero === null || numero === undefined || Number.isNaN(numero)) {
    return null;
  }

  return `${numero.toFixed(1).replace(".", ",")} km`;
};

export default function AvaliarPassageiro({
  corrida,
  enviando,
  onAvaliar,
  onBloquear,
  onDispensar,
}: Props) {
  const insets = useSafeAreaInsets();
  const selos = useSelosAvaliacao(true);

  const [nota, setNota] = useState(0);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  // bloquear pede confirmação: o passageiro nunca mais toca nas chamadas
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);

  const bloquear = async () => {
    setBloqueando(true);
    const ok = await onBloquear();
    setBloqueando(false);
    setConfirmandoBloqueio(false);
    if (ok) setBloqueado(true);
  };

  const ganho = formatarValor(corrida.corrida_financeiro?.valor_motorista);
  const cobrarEmDinheiro = formatarValor(
    corrida.corrida_financeiro?.valor_pago_passageiro,
  );
  const distancia = formatarKm(corrida.distancia_total);
  const passageiro = corrida.convidado_nome || corrida.passageiro?.name;

  const destino = corrida.corrida_destinos?.find(
    (ponto) => ponto.tipo === "destino",
  );
  const grupo = corrida.compartilhada ?? null;

  return (
    <View style={styles.sobreposicao}>
      <View
        style={[
          styles.cartao,
          { paddingBottom: insets.bottom + 20, maxHeight: "92%" },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.titulo}>
          {grupo ? "Viagem compartilhada finalizada" : "Corrida finalizada"}
        </Text>
        <Text style={styles.codigo}>
          {grupo
            ? `Passageiro ${grupo.posicao} de ${grupo.passageiros} · corrida ${corrida.codigo_corrida}`
            : `Corrida ${corrida.codigo_corrida}`}
        </Text>

        {ganho !== null && (
          <>
            <Text style={styles.ganho}>{ganho}</Text>
            <Text style={styles.ganhoApoio}>
              {grupo
                ? `Seu ganho com ${passageiro ?? "este passageiro"} · ${formatarValor(grupo.valor_total_motorista)} na viagem toda`
                : "Seu ganho nesta corrida"}
            </Text>
          </>
        )}

        {/* no dinheiro o passageiro paga ao motorista o valor cheio (com a
            taxa da plataforma): sem isso o motorista cobrava só o ganho */}
        {corrida.metodo_pagamento === "dinheiro" && cobrarEmDinheiro ? (
          <View style={styles.cobrar}>
            <Ionicons name="cash-outline" size={22} color="#0F7B4E" />
            <Text style={styles.cobrarTexto}>
              Receba <Text style={styles.cobrarValor}>{cobrarEmDinheiro}</Text>{" "}
              em dinheiro do passageiro
            </Text>
          </View>
        ) : null}

        <View style={styles.detalhes}>
          {distancia !== null && (
            <Text style={styles.linha}>{distancia} rodados</Text>
          )}

          {destino && (
            <Text style={styles.linha} numberOfLines={1}>
              Até {enderecoCurto(destino.endereco)}
            </Text>
          )}
        </View>

        <Text style={styles.pergunta}>
          Como foi {passageiro ? `com ${passageiro}` : "o passageiro"}?
        </Text>

        <View style={styles.estrelas}>
          {ESTRELAS.map((valorEstrela) => (
            <TouchableOpacity
              key={valorEstrela}
              onPress={() => setNota(valorEstrela)}
              disabled={enviando}
              style={styles.estrela}
            >
              <Ionicons
                name={valorEstrela <= nota ? "star" : "star-outline"}
                size={34}
                color={valorEstrela <= nota ? "#fbc02d" : "#BBB"}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* selos (opcionais): só para notas boas e quando a gestão cadastrou algum */}
        {podeEscolherSelos(nota) && selos.length > 0 && (
          <View style={styles.selos}>
            <Text style={styles.selosTitulo}>
              Quer deixar um selo? (opcional)
            </Text>
            <SelosParaEscolher
              selos={selos}
              escolhidos={escolhidos}
              onAlternar={(chave) =>
                setEscolhidos((atuais) => alternarSelo(atuais, chave))
              }
              desabilitado={enviando}
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.botao, nota === 0 && styles.botaoDesativado]}
          disabled={nota === 0 || enviando}
          onPress={() =>
            onAvaliar(nota, podeEscolherSelos(nota) ? escolhidos : [])
          }
        >
          <Text style={styles.textoBotao}>
            {enviando ? "Enviando..." : "Enviar e continuar"}
          </Text>
        </TouchableOpacity>

        {bloqueado ? (
          <View style={styles.bloqueado}>
            <Ionicons name="ban" size={16} color="#B3261E" />
            <Text style={styles.bloqueadoTexto}>
              Passageiro bloqueado: você não receberá mais chamadas dele
            </Text>
          </View>
        ) : confirmandoBloqueio ? (
          <View style={styles.confirmacao}>
            <Text style={styles.confirmacaoTexto}>
              Bloquear {passageiro ?? "este passageiro"}? Você não receberá mais
              chamadas dele.
            </Text>
            <View style={styles.confirmacaoBotoes}>
              <TouchableOpacity
                style={styles.confirmacaoCancelar}
                disabled={bloqueando}
                onPress={() => setConfirmandoBloqueio(false)}
              >
                <Text style={styles.confirmacaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmacaoBloquear}
                disabled={bloqueando}
                onPress={() => void bloquear()}
              >
                <Text style={styles.confirmacaoBloquearTexto}>
                  {bloqueando ? "Bloqueando..." : "Bloquear"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.botaoBloquear}
            disabled={enviando}
            onPress={() => setConfirmandoBloqueio(true)}
          >
            <Ionicons name="ban-outline" size={16} color="#B3261E" />
            <Text style={styles.textoBloquear}>Bloquear usuário</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.botaoPular}
          disabled={enviando}
          onPress={onDispensar}
        >
          <Text style={styles.textoPular}>Lembrar depois</Text>
        </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  cartao: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  codigo: { fontSize: 12, color: "#777", marginTop: 3 },
  ganho: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111",
    marginTop: 8,
  },
  cobrar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E8F8F1",
  },
  cobrarTexto: { flex: 1, fontSize: 15, color: "#0F5132" },
  cobrarValor: { fontWeight: "800" },
  ganhoApoio: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  detalhes: {
    marginTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  linha: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  pergunta: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginTop: 18,
    textAlign: "center",
  },
  estrelas: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
  estrela: {
    paddingHorizontal: 6,
  },
  selos: { marginTop: 16 },
  selosTitulo: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
  },
  botaoBloquear: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
  },
  textoBloquear: { fontSize: 14, color: "#B3261E", fontWeight: "600" },
  bloqueado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FDECEA",
  },
  bloqueadoTexto: { flex: 1, fontSize: 13, color: "#B3261E" },
  confirmacao: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FDECEA",
  },
  confirmacaoTexto: { fontSize: 14, color: "#5C1A15", lineHeight: 19 },
  confirmacaoBotoes: { flexDirection: "row", gap: 10, marginTop: 10 },
  confirmacaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  confirmacaoCancelarTexto: { fontSize: 14, color: "#444", fontWeight: "600" },
  confirmacaoBloquear: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#B3261E",
  },
  confirmacaoBloquearTexto: { fontSize: 14, color: "#FFF", fontWeight: "700" },
  botao: {
    marginTop: 18,
    backgroundColor: "#fbc02d",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  botaoDesativado: {
    backgroundColor: "#EEE",
  },
  textoBotao: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  botaoPular: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  textoPular: {
    fontSize: 14,
    color: "#888",
  },
});
