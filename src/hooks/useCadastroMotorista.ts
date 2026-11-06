import { api } from "@/Services/api";
import { useCallback, useEffect, useState } from "react";

export type SituacaoCadastro =
  | "sem_cadastro"
  | "pendente"
  | "em_analise"
  | "aprovado"
  | "ativo"
  | "reprovado";

export interface DocumentoEnviado {
  tipo_documento: string;
  status: string;
  observacao: string | null;
  created_at?: string;
  motivo_reprovacao_texto?: string | null;
  vencido?: boolean;
}

export interface CadastroMotorista {
  situacao: SituacaoCadastro;
  cnh: {
    numero: string;
    categoria: string;
    expiracao: string;
    ear: boolean;
  } | null;
  documentos: DocumentoEnviado[];
  documentos_faltando: string[];
  veiculos: number;
  pendencias: ("cnh" | "documentos" | "veiculo")[];
  // documentos vencidos ou reprovados e "veiculo" quando não há veículo
  acoes_necessarias?: string[];
  // já foi aprovado uma vez: fica na home mesmo com pendência
  liberado?: boolean;
}

const mensagemDoErro = (erro: unknown, padrao: string) => {
  const resposta = (
    erro as {
      response?: {
        data?: { message?: string; errors?: Record<string, string[]> };
      };
    }
  )?.response;

  const primeiroErro = Object.values(resposta?.data?.errors ?? {})[0]?.[0];

  return primeiroErro ?? resposta?.data?.message ?? padrao;
};

// Buscado ainda na tela do código: a liberação abre pronta, sem tela de carregando.
let cadastroAdiantado: CadastroMotorista | null = null;

export const adiantarCadastro = async () => {
  try {
    const { data } = await api.get<CadastroMotorista>("/motorista/cadastro");

    cadastroAdiantado = data;
  } catch {
    // a própria tela busca de novo ao abrir
  }
};

export function useCadastroMotorista() {
  const [cadastro, setCadastro] = useState<CadastroMotorista | null>(() => {
    const adiantado = cadastroAdiantado;

    cadastroAdiantado = null;

    return adiantado;
  });
  const [carregando, setCarregando] = useState(cadastro === null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<CadastroMotorista>("/motorista/cadastro");

      setCadastro(data);
      setErro("");
    } catch (falha) {
      setErro(mensagemDoErro(falha, "Não foi possível carregar seu cadastro."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void carregar(), 0);

    return () => clearTimeout(timer);
  }, [carregar]);

  // atalho de desenvolvimento: pula CNH e documentos e aprova direto (ver
  // MotoristaCadastroController::aprovarDev no backend)
  const aprovarDev = useCallback(async () => {
    setEnviando(true);
    setErro("");

    try {
      await api.post("/motorista/cadastro/aprovar-dev");
      await carregar();

      return true;
    } catch (falha) {
      setErro(mensagemDoErro(falha, "Não foi possível aprovar o cadastro."));

      return false;
    } finally {
      setEnviando(false);
    }
  }, [carregar]);

  return {
    cadastro,
    carregando,
    enviando,
    erro,
    aprovarDev,
    recarregar: carregar,
  };
}
