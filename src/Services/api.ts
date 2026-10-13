import axios, { create } from "axios";
import * as SecureStore from "expo-secure-store";
import { urlDeDesenvolvimento } from "@/Services/hostDev";

const baseURL = urlDeDesenvolvimento(process.env.EXPO_PUBLIC_API_URL?.trim());

if (!baseURL) {
  throw new Error("EXPO_PUBLIC_API_URL não foi configurada.");
}

if (!__DEV__ && !baseURL.startsWith("https://")) {
  throw new Error("A API de produção precisa usar HTTPS.");
}

export const api = create({
  baseURL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Perfil": "motorista",
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync("token");

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

type UnauthorizedHandler = () => void | Promise<void>;
let onUnauthorized: UnauthorizedHandler | null = null;
let notificandoNaoAutorizado = false;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

const notificarNaoAutorizado = async () => {
  if (notificandoNaoAutorizado || onUnauthorized === null) return;

  notificandoNaoAutorizado = true;
  try {
    await onUnauthorized();
  } finally {
    notificandoNaoAutorizado = false;
  }
};

export const ehErroDeRede = (error: unknown) =>
  Boolean(error) &&
  typeof error === "object" &&
  "isAxiosError" in (error as object) &&
  !(error as { response?: unknown }).response;

export const mensagemDaApi = (error: unknown, padrao: string): string => {
  const mensagem = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;

  return typeof mensagem === "string" && mensagem.trim() !== ""
    ? mensagem
    : padrao;
};

let renovacaoEmAndamento: Promise<string | null> | null = null;

const renovarToken = (): Promise<string | null> => {
  renovacaoEmAndamento ??= (async () => {
    try {
      const token = await SecureStore.getItemAsync("token");

      if (!token) return null;

      const { data } = await axios.post<{ token?: string }>(
        `${baseURL}/auth/refresh`,
        {},
        {
          timeout: 10000,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-Perfil": "motorista",
          },
        },
      );

      if (typeof data?.token !== "string") return null;

      await SecureStore.setItemAsync("token", data.token);

      return data.token;
    } catch {
      return null;
    } finally {
      renovacaoEmAndamento = null;
    }
  })();

  return renovacaoEmAndamento;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    const tinhaToken = Boolean(config?.headers?.Authorization);

    if (
      error?.response?.status === 401 &&
      tinhaToken &&
      config?.url !== "/auth/logout"
    ) {
      if (!config.__jaTentouRenovar) {
        config.__jaTentouRenovar = true;

        const novoToken = await renovarToken();

        if (novoToken) {
          config.headers.Authorization = `Bearer ${novoToken}`;

          return api.request(config);
        }
      }

      await notificarNaoAutorizado();
    }

    return Promise.reject(error);
  },
);
