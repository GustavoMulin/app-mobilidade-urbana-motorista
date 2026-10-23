import { api } from "@/Services/api";
import { useToast } from "@/context/ToastContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const TEMPO_LEMBRETE_MS = 12 * 60 * 60 * 1000;
const chaveLembrete = (corridaId: number) =>
  `avaliacao_motorista_adiada:${corridaId}`;

export interface CorridaParaAvaliar {
  id: number;
  codigo_corrida: string;
  distancia_total?: string | number | null;
  convidado_nome?: string | null;
  passageiro?: { user?: { name?: string | null } | null } | null;
  metodo_pagamento?: string | null;
  corrida_financeiro?: {
    valor_motorista?: string | number | null;
    valor_pago_passageiro?: string | number | null;
  } | null;
  corrida_destinos?: { tipo: string; endereco: string }[] | null;
  // compartilhada: uma janela por passageiro, com o total da viagem
  compartilhada?: {
    passageiros: number;
    posicao: number;
    valor_total_motorista: number;
  } | null;
}

export function useAvaliacaoPendente(recarregarQuando: unknown) {
  const { mostrarToast } = useToast();
  const [corrida, setCorrida] = useState<CorridaParaAvaliar | null>(null);
  const [enviando, setEnviando] = useState(false);

  const buscar = useCallback(async () => {
    try {
      const { data } = await api.get<{
        corrida: CorridaParaAvaliar | null;
        avaliando_como?: string | null;
      }>("/corrida-para-avaliar");

      const pendente =
        data?.avaliando_como === "motorista" ? (data?.corrida ?? null) : null;

      if (pendente === null) {
        setCorrida(null);
        return;
      }

      const adiadaAte = Number(
        await AsyncStorage.getItem(chaveLembrete(pendente.id)),
      );

      setCorrida(adiadaAte > Date.now() ? null : pendente);
    } catch {
      // sem avaliação pendente é o caso normal
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void buscar(), 0);

    return () => clearTimeout(timer);
  }, [buscar, recarregarQuando]);

  const avaliar = useCallback(
    async (nota: number, comentario?: string) => {
      if (corrida === null) return false;

      setEnviando(true);

      try {
        await api.post("/avaliacoes-corridas", {
          corrida_id: corrida.id,
          nota,
          comentario,
        });

        await AsyncStorage.removeItem(chaveLembrete(corrida.id));

        setCorrida(null);
        mostrarToast({
          tipo: "success",
          titulo: "Avaliação enviada",
          mensagem: `Corrida ${corrida.codigo_corrida}.`,
        });
        // compartilhada: cada passageiro do grupo tem a própria janela, em seguida
        await buscar();

        return true;
      } catch {
        mostrarToast({
          tipo: "error",
          titulo: "A avaliação não foi salva",
          mensagem: "Confira sua conexão e tente enviar novamente.",
        });
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [corrida, mostrarToast, buscar],
  );

  const dispensar = useCallback(() => {
    if (corrida !== null) {
      void AsyncStorage.setItem(
        chaveLembrete(corrida.id),
        String(Date.now() + TEMPO_LEMBRETE_MS),
      );
    }

    setCorrida(null);
  }, [corrida]);

  return { corrida, enviando, avaliar, dispensar };
}
