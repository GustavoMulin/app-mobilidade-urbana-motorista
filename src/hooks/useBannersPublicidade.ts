import { api } from "@/Services/api";
import { comTempoLimite } from "@/domain/localizacao";
import * as Location from "expo-location";
import { useEffect, useState } from "react";

export interface BannerPublicidade {
  id: number;
  titulo: string;
  url: string;
}

const TEMPO_LIMITE_GPS_MS = 15_000;

// os banners são cadastrados por cidade no painel de gestão: o nome da cidade
// sai do GPS do celular (sem permissão ou fora do cadastro, não há banner)
export function useBannersPublicidade() {
  const [banners, setBanners] = useState<BannerPublicidade[]>([]);

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      try {
        const permissao = await Location.getForegroundPermissionsAsync();
        if (permissao.status !== "granted") return;

        const posicao =
          (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })) ??
          (await comTempoLimite(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            TEMPO_LIMITE_GPS_MS,
          ));
        const [endereco] = await Location.reverseGeocodeAsync(posicao.coords);
        const cidade = endereco?.city ?? endereco?.subregion;

        if (!cidade || cancelado) return;

        const { data } = await api.get<{ data: BannerPublicidade[] }>(
          "/banners",
          { params: { cidade }, timeout: 10000 },
        );

        if (!cancelado) setBanners(data?.data ?? []);
      } catch {
        // sem banner nesta abertura; a tela continua igual
      }
    };

    void carregar();

    return () => {
      cancelado = true;
    };
  }, []);

  return banners;
}
