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
}

export interface DadosCnh {
  // nome do campo no backend (antes era cnh_numero)
  numero_registro: string;
  cnh_categoria: string;
  cnh_expiracao: string;
  ear: boolean;
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

export function useCadastroMotorista() {
  const [cadastro, setCadastro] = useState<CadastroMotorista | null>(null);
  const [carregando, setCarregando] = useState(true);
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

  const enviarCnh = useCallback(
    async (dados: DadosCnh) => {
      setEnviando(true);
      setErro("");

      try {
        await api.post("/motorista/cadastro/cnh", dados);
        await carregar();

        return true;
      } catch (falha) {
        setErro(mensagemDoErro(falha, "Não foi possível enviar sua CNH."));

        return false;
      } finally {
        setEnviando(false);
      }
    },
    [carregar],
  );

  const enviarDocumento = useCallback(
    async (
      tipo: string,
      arquivo: { uri: string; name: string; mimeType?: string },
    ) => {
      setEnviando(true);
      setErro("");

      try {
        const dados = new FormData();
        dados.append("tipo_documento", tipo);
        dados.append("arquivo", {
          uri: arquivo.uri,
          name: arquivo.name,
          type: arquivo.mimeType ?? "application/octet-stream",
        } as unknown as Blob);
        await api.post("/motorista/cadastro/documentos", dados);
        await carregar();
        return true;
      } catch (falha) {
        setErro(mensagemDoErro(falha, "Não foi possível enviar o documento."));
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [carregar],
  );

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
    enviarCnh,
    enviarDocumento,
    aprovarDev,
    recarregar: carregar,
  };
}
