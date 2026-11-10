import type {
  CadastroMotorista,
  SituacaoCadastro,
} from "@/hooks/useCadastroMotorista";

const EXIGIDOS = ["cnh", "crlv", "nada_consta", "seguro_obrigatorio"];

// O servidor mantém "pendente" até aprovar tudo. Com os 4 enviados o motorista
// não tem mais o que fazer: chamar de incompleto seria falso, falta só a análise.
export const situacaoNaLiberacao = (
  cadastro: CadastroMotorista | null,
): SituacaoCadastro => {
  if (!cadastro) return "sem_cadastro";

  const enviouTudo = EXIGIDOS.every((tipo) => {
    const documento = cadastro.documentos.find(
      (item) => item.tipo_documento === tipo,
    );

    return documento !== undefined && documento.status !== "reprovado";
  });

  return cadastro.situacao === "pendente" && enviouTudo
    ? "em_analise"
    : cadastro.situacao;
};
