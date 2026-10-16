import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { removerAparelho } from "@/Services/push";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import { api, ehErroDeRede, setUnauthorizedHandler } from "../Services/api";
import { encerrarEcho } from "../Services/echo";

// =========================
// INTERFACES
// =========================

interface Usuario {
  id: string;
  email: string;
  name: string;
  telefone: string;
  cpf: string | null;
  data_nascimento: string;
  foto: string;
  perfil: "motorista";
  status?: string | null;
}

interface AuthResponse {
  user: Usuario;
  token: string;
}

interface DadosCadastro {
  email: string;
  name: string;
  data_nascimento: string;
  password: string;
  telefone?: string;
}

// este app cadastra motorista; sem o perfil o backend cria só o usuário e
// todo endpoint do motorista responde 403
const PERFIL_DESTE_APP = "motorista";

interface AtualizarFotoPayload {
  foto: string;
}

interface AuthContextType {
  user: Usuario | null;

  loading: boolean;

  login: (email: string, password: string) => Promise<void>;

  loginComToken: (user: Usuario, token: string) => Promise<void>;

  logout: () => Promise<void>;

  register: (dados: DadosCadastro) => Promise<void>;

  atualizarFotoUsuario: (dados: AtualizarFotoPayload) => Promise<void>;

  sessaoValida: () => Promise<boolean>;
}

// =========================
// CONTEXT
// =========================

const AuthContext = createContext<AuthContextType>({
  user: null,

  loading: true,

  login: async (email: string, password: string) => {},

  loginComToken: async (user: Usuario, token: string) => {},

  logout: async () => {},

  register: async (dados: DadosCadastro) => {},

  atualizarFotoUsuario: async (dados: AtualizarFotoPayload) => {},

  sessaoValida: async () => true,
});

// =========================
// PROVIDER
// =========================

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const logoutEmAndamento = useRef(false);

  const [loading, setLoading] = useState(true);

  const limparSessaoLocal = useCallback(async () => {
    encerrarEcho();
    setUser(null);
    await Promise.allSettled([
      SecureStore.deleteItemAsync("token"),
      SecureStore.deleteItemAsync("user"),
    ]);
  }, []);

  // =========================
  // RESTAURA SESSÃO
  // =========================

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user");
        const storedToken = await SecureStore.getItemAsync("token");

        // só restaura se tiver os dois; usuário sem token não consegue
        // autenticar nenhuma requisição
        if (storedUser && storedToken) {
          const parsedUser = JSON.parse(storedUser) as Partial<Usuario>;

          if (!parsedUser.id || !parsedUser.name) {
            await limparSessaoLocal();
            return;
          }

          setUser(parsedUser as Usuario);
        } else if (storedUser || storedToken) {
          await limparSessaoLocal();
        }
      } catch (error) {
        if (__DEV__) console.error("Erro ao restaurar sessão:", error);
        await limparSessaoLocal();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [limparSessaoLocal]);

  // =========================
  // LOGIN
  // =========================

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      const response = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
        perfil: PERFIL_DESTE_APP,
      });

      const { user, token } = response.data;

      await SecureStore.setItemAsync("user", JSON.stringify(user));

      await SecureStore.setItemAsync("token", token);
      setUser(user);
      logoutEmAndamento.current = false;
    } catch (error: any) {
      if (__DEV__) {
        console.error(
          "Erro ao fazer login:",
          error?.response?.status,
          error?.response?.data ?? error?.message,
        );
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginComToken = async (userData: Usuario, token: string) => {
    try {
      setLoading(true);

      await SecureStore.setItemAsync("user", JSON.stringify(userData));

      await SecureStore.setItemAsync("token", token);
      setUser(userData);
      logoutEmAndamento.current = false;
    } catch (error) {
      console.error("Erro ao autenticar com token:", error);

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = async () => {
    if (logoutEmAndamento.current) return;
    logoutEmAndamento.current = true;
    try {
      const token = await SecureStore.getItemAsync("token");
      // o aparelho para de receber o push desta conta (precisa do token ainda)
      if (token) await removerAparelho();
      if (token) await api.post("/auth/logout");
    } catch {
      // Token expirado ou rede indisponível não impedem a saída local.
    } finally {
      try {
        await limparSessaoLocal();
      } finally {
        router.replace("/login");
        logoutEmAndamento.current = false;
      }
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      if (logoutEmAndamento.current) return;
      logoutEmAndamento.current = true;
      // token já é inválido (401): só limpa localmente, não chama /auth/logout
      await limparSessaoLocal();

      router.replace({
        pathname: "/login",
        params: { motivo: "sessao-expirada" },
      });
    });

    return () => setUnauthorizedHandler(null);
  }, [limparSessaoLocal]);

  const sessaoValida = useCallback(async () => {
    try {
      const { data } = await api.get<Partial<Usuario>>("/usuario-logado");

      // o usuário guardado no aparelho pode estar desatualizado (nome/foto
      // trocados em outro lugar) ou até ser de outra conta: com o banco de
      // desenvolvimento recriado, o mesmo token passou a apontar para outro
      // usuário e o app seguia mostrando o nome antigo. Vale o do servidor.
      if (data?.id) {
        const salvo = await SecureStore.getItemAsync("user");
        const anterior = salvo ? (JSON.parse(salvo) as Partial<Usuario>) : null;
        const mesmaConta =
          anterior !== null && String(anterior.id) === String(data.id);
        const atualizado = {
          ...(mesmaConta ? anterior : {}),
          ...data,
        } as Usuario;

        if (JSON.stringify(atualizado) !== salvo) {
          await SecureStore.setItemAsync("user", JSON.stringify(atualizado));
          setUser(atualizado);
        }
      }

      return true;
    } catch (error) {
      return ehErroDeRede(error);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    void sessaoValida();

    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        void sessaoValida();
      }
    });

    return () => assinatura.remove();
  }, [user, sessaoValida]);

  // =========================
  // REGISTER
  // =========================

  const register = async (dadosCadastro: DadosCadastro) => {
    try {
      setLoading(true);

      const response = await api.post<AuthResponse>("/auth/register", {
        ...dadosCadastro,
        perfil: PERFIL_DESTE_APP,
      });

      const { user, token } = response.data;

      await SecureStore.setItemAsync("user", JSON.stringify(user));

      await SecureStore.setItemAsync("token", token);
      setUser(user);
      logoutEmAndamento.current = false;
    } catch (error: any) {
      if (__DEV__ && error?.response?.status !== 422) {
        console.warn("Falha inesperada no cadastro:", error?.response?.status);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ATUALIZAR FOTO USUÁRIO
  // =========================

  const atualizarFotoUsuario = async ({ foto }: AtualizarFotoPayload) => {
    if (!user) return;

    const usuarioAtualizado = {
      ...user,
      foto,
    };

    setUser(usuarioAtualizado);

    await SecureStore.setItemAsync("user", JSON.stringify(usuarioAtualizado));
  };

  // =========================
  // PROVIDER
  // =========================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginComToken,
        logout,
        register,
        atualizarFotoUsuario,
        sessaoValida,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================
// HOOK
// =========================

export const useAuth = () => useContext(AuthContext);
