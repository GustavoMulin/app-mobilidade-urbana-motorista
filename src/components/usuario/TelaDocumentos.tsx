import { Text } from "@/components/common/Texto";
import { useToast } from "@/context/ToastContext";
import type { CadastroMotorista } from "@/hooks/useCadastroMotorista";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdicionarVeiculo from "./AdicionarVeiculo";
import EnviarDocumentoMotorista, {
  DOCUMENTOS,
  type TipoDocumento,
} from "./EnviarDocumentoMotorista";

interface Props {
  cadastro: CadastroMotorista | null;
  erro?: boolean;
  onEnviado: () => void;
  // sem ele não há seta: a liberação não tem para onde voltar
  onVoltar?: () => void;
  onAtualizar?: () => Promise<void>;
  // o CRLV só entra na liberação; depois dela ele fica em "Meus veículos"
  comCrlv?: boolean;
  aviso?: { titulo: string; texto: string; cor: string };
  children?: ReactNode;
}

type Linha = (typeof DOCUMENTOS)[number];

const TITULOS: Record<TipoDocumento, string> = {
  cnh: "CNH (Motorista)",
  crlv: "CRLV (Veículo)",
  nada_consta: "Antecedentes Criminais",
  seguro_obrigatorio: "Seguro obrigatório",
};
const STATUS: Record<string, string> = {
  aprovado: "Aprovado",
  em_analise: "Em análise",
  reprovado: "Reprovado",
};

const dataEnvio = (iso?: string) =>
  iso ? `Enviado em ${new Date(iso).toLocaleDateString("pt-BR")}` : "";

export default function TelaDocumentos({
  cadastro,
  erro = false,
  onEnviado,
  onVoltar,
  onAtualizar,
  comCrlv = false,
  aviso,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { mostrarToast } = useToast();
  // null: fechado; undefined no tipo: abre pela escolha do documento
  const [envio, setEnvio] = useState<{ tipo?: TipoDocumento } | null>(null);
  const [adicionandoVeiculo, setAdicionandoVeiculo] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  // sem veículo, só o cadastro dele cria o veículo quando a gestão aprova o CRLV
  const semVeiculo = cadastro?.veiculos === 0;
  const documentos = DOCUMENTOS.filter(
    (item) => comCrlv || item.tipo !== "crlv",
  );
  const documentoDe = (tipo: TipoDocumento) =>
    cadastro?.documentos.find((doc) => doc.tipo_documento === tipo);
  // só não enviado, recusado ou vencido; o servidor recusa do mesmo jeito
  const podeEnviar = (tipo: TipoDocumento) => {
    const documento = documentoDe(tipo);

    return !documento || documento.status === "reprovado" || documento.vencido;
  };
  const enviaveis = documentos.map((item) => item.tipo).filter(podeEnviar);
  const nadaAEnviar = enviaveis.length === 0;

  const abrirEnvio = (tipo?: TipoDocumento) => {
    if (tipo === "crlv" && semVeiculo) setAdicionandoVeiculo(true);
    else setEnvio({ tipo });
  };

  const concluirEnvio = (tipo: TipoDocumento) => {
    onEnviado();
    mostrarToast({
      tipo: "success",
      icone: "document-text",
      translucido: true,
      titulo: "Documento enviado para análise",
      chave: `documento-enviado:${tipo}`,
    });
  };

  const atualizar = async () => {
    setAtualizando(true);
    await onAtualizar?.();
    setAtualizando(false);
  };

  const renderItem = ({ item }: { item: Linha }) => {
    const titulo = TITULOS[item.tipo];
    const enviado = documentoDe(item.tipo);
    const status = enviado?.vencido
      ? "Vencido"
      : enviado
        ? (STATUS[enviado.status] ?? enviado.status)
        : cadastro
          ? "Não enviado"
          : "";
    const getStatusColor = (valor: string) => {
      if (valor === "Aprovado") return "#10B981";
      if (valor === "Em análise") return "#F59E0B";
      if (valor === "Não enviado") return "#8A8A8A";
      return "#D32F2F";
    };

    return (
      <TouchableOpacity
        style={styles.documentoLinha}
        onPress={() => abrirEnvio(item.tipo)}
        disabled={!podeEnviar(item.tipo)}
        accessibilityRole="button"
        accessibilityLabel={`${titulo}, ${status}`}
      >
        <MaterialCommunityIcons
          name={item.icone}
          color="#222"
          size={40}
          style={styles.iconeDocumento}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.docTitle}>{titulo}</Text>
          <Text style={styles.docDate}>
            {enviado && !enviado.vencido
              ? dataEnvio(enviado.created_at)
              : "Toque para enviar"}
          </Text>
        </View>

        {status ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(status) },
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* HEADER */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 12, 45) }]}
      >
        <View style={styles.headerContent}>
          {onVoltar ? (
            <TouchableOpacity onPress={onVoltar}>
              <Ionicons name="arrow-back-outline" size={26} color="#111" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerEspaco} />
          )}
          <Text style={styles.headerTitle}>Documentos enviados</Text>
          <View style={styles.headerEspaco} />
        </View>
      </View>

      {/* BODY */}
      <View
        style={[styles.body, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.descriptionBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={aviso?.cor ?? "#666"}
          />
          <View style={styles.descriptionConteudo}>
            {aviso ? (
              <Text style={[styles.descriptionTitulo, { color: aviso.cor }]}>
                {aviso.titulo}
              </Text>
            ) : null}
            <Text style={styles.descriptionText}>
              {aviso?.texto ??
                "Aqui você pode acompanhar o status de validação dos documentos que você enviou para a nossa plataforma."}
            </Text>
          </View>
        </View>

        <FlatList
          data={documentos}
          keyExtractor={(item) => item.tipo}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={atualizando}
          onRefresh={onAtualizar ? () => void atualizar() : undefined}
          ListFooterComponent={
            <>
              {erro ? (
                <Text style={styles.docDate}>
                  Não foi possível carregar seus documentos.
                </Text>
              ) : null}
              {children}
            </>
          }
        />

        <TouchableOpacity
          style={[styles.newDocButton, nadaAEnviar && styles.newDocInativo]}
          onPress={() => abrirEnvio()}
          disabled={nadaAEnviar}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={nadaAEnviar ? "#CFCFD3" : "#111"}
          />
          <Text
            style={[
              styles.newDocText,
              nadaAEnviar && styles.newDocTextoInativo,
            ]}
          >
            Enviar novo documento
          </Text>
        </TouchableOpacity>
      </View>

      {envio && (
        <EnviarDocumentoMotorista
          tipoInicial={envio.tipo}
          tipos={enviaveis}
          onCadastrarVeiculo={
            semVeiculo
              ? () => {
                  setEnvio(null);
                  setAdicionandoVeiculo(true);
                }
              : undefined
          }
          onClose={() => setEnvio(null)}
          onEnviado={concluirEnvio}
        />
      )}

      {adicionandoVeiculo && (
        <AdicionarVeiculo
          onClose={() => setAdicionandoVeiculo(false)}
          onEnviado={() => {
            setAdicionandoVeiculo(false);
            concluirEnvio("crlv");
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerEspaco: { width: 26 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  body: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  descriptionBox: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  descriptionConteudo: {
    flex: 1,
    marginLeft: 10,
  },
  descriptionTitulo: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 20,
  },
  documentoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    minHeight: 108,
    paddingVertical: 15,
  },
  iconeDocumento: { width: 55, textAlign: "center" },
  infoContainer: { flex: 1 },
  docTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#151515",
  },
  docDate: {
    fontSize: 13,
    color: "#909090",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: "#FFF",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    textTransform: "uppercase",
  },
  newDocButton: {
    flexDirection: "row",
    height: 54,
    backgroundColor: "#FFD600",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  newDocInativo: { backgroundColor: "#F3F3F5" },
  newDocText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginLeft: 8,
  },
  newDocTextoInativo: { color: "#CFCFD3" },
});
