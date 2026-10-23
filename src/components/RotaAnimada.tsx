import { useEffect, useMemo, useState } from "react";
import { Polyline, type LatLng } from "react-native-maps";

// A rota se desenha da origem até o fim em vez de aparecer pronta. A linha
// fica sempre montada (sem rota, sem coordenadas): no Android da nova
// arquitetura, desmontar a Polyline às vezes deixava a linha no mapa.
const DURACAO_MS = 700;
const INTERVALO_MS = 32;
const SEM_COORDENADAS: LatLng[] = [];

interface Props {
  coordenadas: LatLng[];
  // muda quando é outra rota (não só o motorista andando): só aí redesenha
  fase: string | null;
  cor: string;
  largura: number;
  zIndex?: number;
}

const distancia = (a: LatLng, b: LatLng) =>
  Math.hypot(
    a.latitude - b.latitude,
    (a.longitude - b.longitude) * Math.cos((a.latitude * Math.PI) / 180),
  );

// começo da rota até a fração pedida do comprimento, cortando o último trecho
// no meio para o desenho andar suave mesmo com poucos pontos
function inicioDaRota(
  coordenadas: LatLng[],
  acumuladas: number[],
  fracao: number,
): LatLng[] {
  const total = acumuladas[acumuladas.length - 1] ?? 0;
  if (fracao >= 1 || total === 0) return coordenadas;
  const alvo = total * fracao;
  let indice = 1;
  while (indice < acumuladas.length - 1 && acumuladas[indice] < alvo)
    indice += 1;
  const de = coordenadas[indice - 1];
  const ate = coordenadas[indice];
  const trecho = acumuladas[indice] - acumuladas[indice - 1];
  const t = trecho > 0 ? (alvo - acumuladas[indice - 1]) / trecho : 0;
  return [
    ...coordenadas.slice(0, indice),
    {
      latitude: de.latitude + (ate.latitude - de.latitude) * t,
      longitude: de.longitude + (ate.longitude - de.longitude) * t,
    },
  ];
}

export default function RotaAnimada({
  coordenadas,
  fase,
  cor,
  largura,
  zIndex,
}: Props) {
  const acumuladas = useMemo(() => {
    const lista = [0];
    for (let i = 1; i < coordenadas.length; i += 1)
      lista.push(lista[i - 1] + distancia(coordenadas[i - 1], coordenadas[i]));
    return lista;
  }, [coordenadas]);

  const [desenho, setDesenho] = useState({ fase, fracao: 0 });
  if (desenho.fase !== fase) setDesenho({ fase, fracao: 0 });

  // só começa quando o traçado chega (a fase muda antes da resposta da rota)
  const desenhando = desenho.fracao < 1 && coordenadas.length >= 2;
  useEffect(() => {
    if (!desenhando) return;
    const inicio = Date.now();
    const relogio = setInterval(() => {
      const t = Math.min((Date.now() - inicio) / DURACAO_MS, 1);
      const fracao = t >= 1 ? 1 : 1 - (1 - t) ** 3;
      setDesenho((atual) => (atual.fase === fase ? { fase, fracao } : atual));
      if (t >= 1) clearInterval(relogio);
    }, INTERVALO_MS);
    return () => clearInterval(relogio);
  }, [desenhando, fase]);

  const visiveis =
    desenho.fase === fase && coordenadas.length >= 2
      ? inicioDaRota(coordenadas, acumuladas, desenho.fracao)
      : SEM_COORDENADAS;

  return (
    <Polyline
      coordinates={visiveis.length >= 2 ? visiveis : SEM_COORDENADAS}
      strokeWidth={largura}
      strokeColor={cor}
      lineCap="round"
      lineJoin="round"
      zIndex={zIndex}
    />
  );
}
