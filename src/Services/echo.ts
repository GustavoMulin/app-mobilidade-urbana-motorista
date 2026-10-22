import { api } from "@/Services/api";
import { hostDeDesenvolvimento } from "@/Services/hostDev";
import Echo from "laravel-echo";
import PusherImportado from "pusher-js";
import type { Channel } from "pusher-js";
import type { ChannelAuthorizationCallback } from "pusher-js/types/src/core/auth/options";

// O build React Native do pusher-js 8.6 exporta `{ Pusher }`, e não o default
// que os tipos declaram. Sem desembrulhar, o Echo recebia um objeto, lançava
// "Object cannot be used as a constructor" e o tempo real nunca conectava.
const Pusher =
  (PusherImportado as unknown as { Pusher?: typeof PusherImportado }).Pusher ??
  PusherImportado;

// O laravel-echo procura o Pusher no escopo global.
(globalThis as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

const chave = process.env.EXPO_PUBLIC_REVERB_APP_KEY;
const host = hostDeDesenvolvimento(process.env.EXPO_PUBLIC_REVERB_HOST);
const porta = Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080);
const esquema = process.env.EXPO_PUBLIC_REVERB_SCHEME ?? "http";

let instancia: Echo<"reverb"> | null = null;

export const echoConfigurado = () =>
  typeof chave === "string" && chave.length > 0 && typeof host === "string";

export const obterEcho = (): Echo<"reverb"> | null => {
  if (!echoConfigurado()) return null;

  try {
    instancia ??= new Echo({
      broadcaster: "reverb",
      // passado explicitamente: sem isso o laravel-echo procura o Pusher em
      // window.Pusher e **lança** se não achar, derrubando a tela
      Pusher,
      withoutInterceptors: true,
      key: chave,
      wsHost: host,
      wsPort: porta,
      wssPort: porta,
      forceTLS: esquema === "https",
      enabledTransports: ["ws", "wss"],
      // a autorização passa pelo axios do app, que já injeta o JWT e sabe
      // renová-lo — evita duplicar a lógica de token aqui
      authorizer: (canal: Channel) => ({
        authorize: (
          socketId: string,
          callback: ChannelAuthorizationCallback,
        ) => {
          api
            .post("/broadcasting/auth", {
              socket_id: socketId,
              channel_name: canal.name,
            })
            .then(({ data }) => callback(null, data))
            .catch((erro: Error) => callback(erro, null));
        },
      }),
    });
  } catch {
    // tempo real é opcional: se o Echo não subir, o app segue no polling
    instancia = null;
  }

  return instancia;
};

export const encerrarEcho = () => {
  try {
    instancia?.disconnect();
  } catch {
    // desconectar é best-effort
  }

  instancia = null;
};
