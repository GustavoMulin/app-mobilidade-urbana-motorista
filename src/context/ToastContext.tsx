import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text } from "@/components/common/Texto";
import { Animated, Easing, StyleSheet, View } from "react-native";

export type TipoToast = "success" | "error" | "warning" | "info";

export interface OpcoesToast {
  titulo: string;
  mensagem?: string;
  tipo?: TipoToast;
  duracaoMs?: number;
  chave?: string;
}

interface ToastInterno extends Required<Omit<OpcoesToast, "mensagem">> {
  id: number;
  mensagem?: string;
}

interface ToastContextValue {
  mostrarToast: (opcoes: OpcoesToast) => void;
  removerToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// de sucesso e informação, só estes aparecem: corrida aceita e a resposta do
// motorista ao novo destino/trajeto pedido pelo passageiro. Erros e avisos
// sempre aparecem, com o motivo: sem eles a falha ficava muda.
const TOASTS_PERMITIDOS = [
  /^corrida:\d+:aceita$/,
  /^destino:\d+:(aceito|recusado)$/,
];

const DURACAO_ENTRADA_MS = 220;
const DURACAO_SAIDA_MS = 200;

const visual: Record<
  TipoToast,
  {
    cor: string;
    icone: React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  success: {
    cor: "#21C987",
    icone: "checkmark",
  },
  error: {
    cor: "#E24A4A",
    icone: "alert",
  },
  warning: {
    cor: "#E1A728",
    icone: "warning",
  },
  info: {
    cor: "#3488E8",
    icone: "information",
  },
};

function ToastItem({
  toast,
  remover,
}: {
  toast: ToastInterno;
  remover: (id: number) => void;
}) {
  const aparencia = visual[toast.tipo];
  const [opacidade] = useState(() => new Animated.Value(0));
  const [deslocamento] = useState(() => new Animated.Value(8));

  useEffect(() => {
    const animar = (
      opacidadeFinal: number,
      deslocamentoFinal: number,
      duracao: number,
      curva: (valor: number) => number,
    ) =>
      Animated.parallel([
        Animated.timing(opacidade, {
          toValue: opacidadeFinal,
          duration: duracao,
          easing: curva,
          useNativeDriver: true,
        }),
        Animated.timing(deslocamento, {
          toValue: deslocamentoFinal,
          duration: duracao,
          easing: curva,
          useNativeDriver: true,
        }),
      ]);

    animar(1, 0, DURACAO_ENTRADA_MS, Easing.out(Easing.cubic)).start();

    const temporizador = setTimeout(
      () =>
        animar(0, -8, DURACAO_SAIDA_MS, Easing.in(Easing.cubic)).start(() =>
          remover(toast.id),
        ),
      Math.max(0, toast.duracaoMs - DURACAO_SAIDA_MS),
    );

    return () => clearTimeout(temporizador);
  }, [deslocamento, opacidade, remover, toast.duracaoMs, toast.id]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        { opacity: opacidade, transform: [{ translateY: deslocamento }] },
      ]}
    >
      <View style={[styles.iconeCirculo, { backgroundColor: aparencia.cor }]}>
        <Ionicons name={aparencia.icone} size={23} color="#FFFFFF" />
      </View>
      <View style={styles.conteudo}>
        <Text style={styles.titulo}>{toast.titulo}</Text>
        {toast.mensagem ? (
          <Text style={styles.mensagem}>{toast.mensagem}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastInterno[]>([]);
  const proximoId = useRef(1);
  const ultimosAvisos = useRef(new Map<string, number>());

  const removerToast = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const mostrarToast = useCallback((opcoes: OpcoesToast) => {
    const tipo = opcoes.tipo ?? "info";
    const problema = tipo === "error" || tipo === "warning";

    if (
      !problema &&
      !TOASTS_PERMITIDOS.some((padrao) => padrao.test(opcoes.chave ?? ""))
    )
      return;

    const chave =
      opcoes.chave ?? [tipo, opcoes.titulo, opcoes.mensagem ?? ""].join(":");
    const agora = Date.now();
    const ultimoAviso = ultimosAvisos.current.get(chave) ?? 0;

    if (agora - ultimoAviso < 2000) return;

    ultimosAvisos.current.set(chave, agora);

    if (ultimosAvisos.current.size > 50) {
      for (const [chaveAntiga, instante] of ultimosAvisos.current) {
        if (agora - instante > 60_000) {
          ultimosAvisos.current.delete(chaveAntiga);
        }
      }
    }

    const novoToast: ToastInterno = {
      id: proximoId.current++,
      chave,
      titulo: opcoes.titulo,
      mensagem: problema ? opcoes.mensagem : undefined,
      tipo,
      duracaoMs: problema
        ? Math.min(6000, Math.max(3500, opcoes.duracaoMs ?? 4500))
        : Math.min(4000, Math.max(1800, opcoes.duracaoMs ?? 2800)),
    };

    setToasts([novoToast]);
  }, []);

  const valor = useMemo(
    () => ({ mostrarToast, removerToast }),
    [mostrarToast, removerToast],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <View pointerEvents="none" style={styles.camadas}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} remover={removerToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);

  if (contexto === null) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }

  return contexto;
}

const styles = StyleSheet.create({
  camadas: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  toast: {
    maxWidth: 380,
    minHeight: 72,
    borderRadius: 24,
    backgroundColor: "#24272B",
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
  iconeCirculo: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  conteudo: {
    flexShrink: 1,
  },
  titulo: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
  mensagem: {
    color: "#D5D9DE",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
});
