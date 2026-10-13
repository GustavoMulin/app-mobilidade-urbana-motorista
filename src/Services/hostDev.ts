import Constants from "expo-constants";

// Em desenvolvimento o PC troca de IP quando muda de rede e o .env continua
// apontando para o IP antigo: toda chamada fica pendurada e o app parece
// travado. O Metro sempre entrega o app a partir do IP atual do PC, então,
// com o .env apontando para um IP de rede local, usamos o IP do Metro.

const IP = /^\d{1,3}(\.\d{1,3}){3}$/;
const REDE_LOCAL = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

const ipDoMetro = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;
  const host = hostUri?.split(":")[0] ?? null;
  return host && IP.test(host) && REDE_LOCAL.test(host) ? host : null;
};

export function hostDeDesenvolvimento(
  host: string | undefined,
): string | undefined {
  if (!__DEV__ || !host || !REDE_LOCAL.test(host)) return host;
  return ipDoMetro() ?? host;
}

export function urlDeDesenvolvimento(
  url: string | undefined,
): string | undefined {
  if (!__DEV__ || !url) return url;
  return url.replace(
    /^(https?:\/\/)([^/:]+)/,
    (_, protocolo: string, host: string) =>
      protocolo + (hostDeDesenvolvimento(host) ?? host),
  );
}
