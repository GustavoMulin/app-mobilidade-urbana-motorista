export type FalhaLocalizacao = "sem_permissao" | "indisponivel";

// expo-location só usa ERR_LOCATION_UNAUTHORIZED para permissão negada; os
// demais códigos (GPS desligado, diálogo de ativação recusado, aparelho sem
// Google Play Services, sem sinal) são falta de posição, não de permissão —
// tratar tudo como "sem permissão" escondia o mapa atrás de uma tela errada.
export function classificarFalhaLocalizacao(erro: unknown): FalhaLocalizacao {
  const codigo =
    typeof erro === "object" && erro !== null && "code" in erro
      ? (erro as { code: unknown }).code
      : undefined;

  return codigo === "ERR_LOCATION_UNAUTHORIZED" ? "sem_permissao" : "indisponivel";
}

// getCurrentPositionAsync no Android não tem prazo: sem sinal (dentro de
// prédio, GPS frio) a promessa pode ficar pendente indefinidamente.
export function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const temporizador = setTimeout(
      () => reject(new Error(`Tempo esgotado após ${ms} ms`)),
      ms,
    );

    promessa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolve(valor);
      },
      (erro: unknown) => {
        clearTimeout(temporizador);
        reject(erro);
      },
    );
  });
}
