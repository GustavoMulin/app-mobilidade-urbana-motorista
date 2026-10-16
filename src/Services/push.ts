import { api } from "@/Services/api";
import { Platform } from "react-native";

// Push pelo Firebase (FCM): o app registra o token do aparelho no backend
// (POST /dispositivos-push) e o servidor manda os avisos da corrida (motorista
// a caminho, chegou, corrida iniciada...). Ver EnviarPushService no backend.
const PERFIL = "motorista";

type ModuloNotificacoes = typeof import("expo-notifications");

let modulo: ModuloNotificacoes | null | undefined;
let tokenRegistrado: string | null = null;

// o módulo é nativo: num build antigo do app ele não existe e o import
// quebraria a abertura; sem ele o app segue igual, só sem push
function notificacoes(): ModuloNotificacoes | null {
  if (modulo !== undefined) return modulo;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carregamento opcional, ver acima
    modulo = require("expo-notifications") as ModuloNotificacoes;
  } catch {
    modulo = null;
  }
  return modulo;
}

export function configurarNotificacoes() {
  const Notificacoes = notificacoes();
  if (!Notificacoes) return;

  try {
    // com o app aberto o aviso também aparece no topo, como no 99
    Notificacoes.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      void Notificacoes.setNotificationChannelAsync("corridas", {
        name: "Corridas",
        description: "Corrida cancelada, proposta escolhida e pagamentos",
        importance: Notificacoes.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
        lockscreenVisibility: Notificacoes.AndroidNotificationVisibility.PUBLIC,
      }).catch(() => undefined);
    }
  } catch {
    // sem push neste aparelho
  }
}

async function enviarToken(token: string) {
  if (token === tokenRegistrado) return;
  await api.post("/dispositivos-push", {
    token,
    perfil: PERFIL,
    plataforma: Platform.OS === "ios" ? "ios" : "android",
  });
  tokenRegistrado = token;
}

// chamado com a sessão aberta; pede a permissão (Android 13+) uma vez
export async function registrarAparelho(): Promise<() => void> {
  const Notificacoes = notificacoes();
  if (!Notificacoes) return () => undefined;

  try {
    const atual = await Notificacoes.getPermissionsAsync();
    const permissao = atual.granted
      ? atual
      : await Notificacoes.requestPermissionsAsync();
    if (!permissao.granted) return () => undefined;

    const { data } = await Notificacoes.getDevicePushTokenAsync();
    await enviarToken(String(data));

    // o FCM pode trocar o token: o servidor recebe o novo
    const assinatura = Notificacoes.addPushTokenListener((novo) => {
      void enviarToken(String(novo.data)).catch(() => undefined);
    });
    return () => assinatura.remove();
  } catch {
    // sem Firebase configurado no build (google-services.json) não há token
    return () => undefined;
  }
}

// antes de encerrar a sessão: o aparelho deixa de receber os avisos da conta
export async function removerAparelho() {
  if (!tokenRegistrado) return;
  try {
    await api.delete("/dispositivos-push", {
      data: { token: tokenRegistrado },
      timeout: 5000,
    });
  } catch {
    // sem rede: o servidor esquece o token quando o FCM recusar
  } finally {
    tokenRegistrado = null;
  }
}
