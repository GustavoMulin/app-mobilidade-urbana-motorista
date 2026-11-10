import type { TipoDocumento } from "@/components/usuario/EnviarDocumentoMotorista";
import type { CadastroMotorista } from "@/hooks/useCadastroMotorista";

export interface ItemAcao {
  chave: string;
  titulo: string;
  detalhe: string;
  // sem ele a linha só informa: não há o que fazer além de aguardar a gestão
  onPress?: () => void;
}

const NOMES: Record<TipoDocumento, string> = {
  cnh: "CNH",
  crlv: "CRLV",
  nada_consta: "Antecedentes criminais",
  seguro_obrigatorio: "Seguro obrigatório",
};

const juntar = (partes: string[]) =>
  partes.length > 1
    ? `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`
    : (partes[0] ?? "");

// uma linha por pendência; vários veículos em análise viram uma só
export function itensDasAcoes(
  cadastro: CadastroMotorista | null,
  permissoesFaltando: string[],
  abrir: {
    documento: (tipo: TipoDocumento) => void;
    veiculos: () => void;
    permissoes: () => void;
  },
): ItemAcao[] {
  const acoes = cadastro?.acoes_necessarias ?? [];
  const emAnalise = cadastro?.veiculos_em_analise ?? [];
  const placas = emAnalise.flatMap((veiculo) =>
    veiculo.placa ? [veiculo.placa] : [],
  );
  const itens: ItemAcao[] = [];

  if (acoes.includes("veiculo")) {
    itens.push({
      chave: "veiculo",
      titulo: "Cadastre um veículo",
      detalhe: "Você precisa de um veículo para ficar online",
      onPress: abrir.veiculos,
    });
  }
  for (const tipo of Object.keys(NOMES) as TipoDocumento[]) {
    const documento = cadastro?.documentos.find(
      (doc) => doc.tipo_documento === tipo,
    );
    // enviado, continua na lista até a gestão decidir; o CRLV entra pelos veículos
    if (
      !acoes.includes(tipo) &&
      tipo !== "crlv" &&
      documento?.status === "em_analise"
    ) {
      itens.push({
        chave: tipo,
        titulo: NOMES[tipo],
        detalhe: "Documento enviado · em análise",
      });
    }
    if (!acoes.includes(tipo)) continue;
    itens.push({
      chave: tipo,
      titulo: NOMES[tipo],
      detalhe: !documento
        ? "Documento não enviado · envie agora"
        : `${documento.vencido ? "Documento vencido" : "Documento recusado"} · envie um novo`,
      onPress: () => abrir.documento(tipo),
    });
  }
  if (emAnalise.length > 0) {
    itens.push({
      chave: "veiculos_em_analise",
      titulo:
        emAnalise.length === 1
          ? "Veículo em análise"
          : `${emAnalise.length} veículos em análise`,
      detalhe: placas.length
        ? `${placas.length === 1 ? "Placa" : "Placas"} ${juntar(placas)}`
        : "Vamos te avisar quando a análise terminar",
      onPress: abrir.veiculos,
    });
  }
  if (permissoesFaltando.length > 0) {
    const lista = juntar(permissoesFaltando);
    itens.push({
      chave: "permissoes",
      titulo: "Ative as permissões do app",
      detalhe: `${lista[0].toUpperCase()}${lista.slice(1)}`,
      onPress: abrir.permissoes,
    });
  }

  return itens;
}
