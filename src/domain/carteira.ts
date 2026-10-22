import { api } from "@/Services/api";
import type { AxiosError } from "axios";

// carteira do motorista (backend: CarteiraMotoristaController e
// MetodosResgateController). Os saques ainda passam por um provedor simulado.

export type TipoChavePix = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export interface MetodoResgate {
  id: number;
  tipo: "pix" | "conta";
  pix_tipo: TipoChavePix | null;
  pix_chave: string | null;
  documento: string;
  titular_nome: string | null;
  banco_codigo: string | null;
  banco_nome: string | null;
  agencia: string | null;
  agencia_digito: string | null;
  conta: string | null;
  conta_digito: string | null;
  conta_tipo: "corrente" | "poupanca" | null;
  principal: boolean;
  descricao: string;
}

export type StatusSaque = "processando" | "concluido" | "falhou";

export interface Saque {
  id: number;
  valor: number;
  taxa: number;
  status: StatusSaque;
  destino: string;
  erro: string | null;
  concluido_em: string | null;
  created_at: string;
}

export interface Movimento {
  tipo: "corrida" | "taxa_dinheiro" | "taxa_cancelamento" | "saque";
  id: number;
  descricao: string;
  detalhe: string;
  valor: number;
  // corrida em dinheiro: o que o passageiro pagou em mãos (fora do saldo)
  recebido_em_maos?: number | null;
  status: StatusSaque | null;
  quando: string | null;
}

export interface Carteira {
  saldo: number;
  disponivel_para_saque: number;
  valor_minimo: number;
  taxa: number;
  metodo_principal: MetodoResgate | null;
  movimentos: Movimento[];
}

export const ROTULO_CHAVE_PIX: Record<TipoChavePix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  telefone: "Celular",
  email: "E-mail",
  aleatoria: "Chave aleatória",
};

// os bancos mais usados; o código é o COMPE de 3 dígitos
export const BANCOS: { codigo: string; nome: string }[] = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "033", nome: "Santander" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "077", nome: "Banco Inter" },
  { codigo: "336", nome: "C6 Bank" },
  { codigo: "290", nome: "PagBank" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "212", nome: "Banco Original" },
  { codigo: "655", nome: "Neon (Votorantim)" },
];

export const formatarReais = (valor: number | null | undefined) =>
  typeof valor === "number" && Number.isFinite(valor)
    ? `${valor < 0 ? "-" : ""}R$ ${Math.abs(valor).toFixed(2).replace(".", ",")}`
    : "—";

export const somenteDigitos = (texto: string) => texto.replace(/\D/g, "");

export function lerValorEmReais(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  // "1.234,56" e "1234,56" viram 1234.56; "12.5" também vale
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null;
}

export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let posicao = 9; posicao < 11; posicao++) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) {
      soma += Number(cpf[i]) * (posicao + 1 - i);
    }
    if (Number(cpf[posicao]) !== ((10 * soma) % 11) % 10) return false;
  }
  return true;
}

// a 99 também descobre o tipo pela própria chave digitada
export function detectarTipoChavePix(chave: string): TipoChavePix | null {
  const texto = chave.trim();
  if (!texto) return null;
  if (texto.includes("@")) return "email";
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      texto,
    )
  ) {
    return "aleatoria";
  }
  const digitos = somenteDigitos(texto);
  if (digitos.length === 14) return "cnpj";
  if (digitos.length === 11 && cpfValido(digitos) && !texto.startsWith("("))
    return "cpf";
  if (digitos.length === 10 || digitos.length === 11) return "telefone";
  if (/^55\d{10,11}$/.test(digitos)) return "telefone";
  return null;
}

export function mensagemDeErro(erro: unknown, padrao: string): string {
  const resposta = (
    erro as AxiosError<{
      message?: string;
      errors?: Record<string, string[]>;
    }>
  )?.response;
  const primeiroCampo = resposta?.data?.errors
    ? Object.values(resposta.data.errors)[0]?.[0]
    : undefined;
  return primeiroCampo ?? resposta?.data?.message ?? padrao;
}

export const carregarCarteira = async () =>
  (await api.get<Carteira>("/motorista/me/carteira")).data;

export const carregarMetodosResgate = async () =>
  (await api.get<{ data: MetodoResgate[] }>("/motorista/me/metodos-resgate"))
    .data.data;

export const salvarMetodoResgate = async (dados: Record<string, unknown>) =>
  (
    await api.post<{ data: MetodoResgate }>(
      "/motorista/me/metodos-resgate",
      dados,
    )
  ).data.data;

export const tornarPrincipal = async (id: number) =>
  (
    await api.post<{ data: MetodoResgate }>(
      `/motorista/me/metodos-resgate/${id}/principal`,
    )
  ).data.data;

export const pedirCodigoDaConta = async () =>
  (
    await api.post<{ enviado: boolean; codigo_teste?: string }>(
      "/motorista/me/metodos-resgate/codigo",
    )
  ).data;

export const sacar = async (valor: number) =>
  (await api.post<{ data: Saque }>("/motorista/me/saques", { valor })).data
    .data;

export const consultarSaque = async (id: number) =>
  (await api.get<{ data: Saque }>(`/motorista/me/saques/${id}`)).data.data;
