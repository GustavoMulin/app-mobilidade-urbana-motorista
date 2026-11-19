import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Modo claro ou escuro escolhido em Preferências. A escolha fica salva no
// aparelho e vale para o app todo, inclusive para o mapa.
const CHAVE = "motorista:tema";

export type Modo = "claro" | "escuro";

export interface CoresDoTema {
  /** fundo das telas */
  fundo: string;
  /** cabeçalhos, folhas e rodapés */
  superficie: string;
  /** painel de baixo da tela do mapa (folha, Buscando e menu): combina com o mapa */
  painel: string;
  /** grupos de cartões sobre o fundo */
  cartao: string;
  /** itens dentro de um cartão */
  item: string;
  texto: string;
  textoApoio: string;
  textoDesativado: string;
  borda: string;
  icone: string;
  /** véu atrás das telas que deslizam */
  veu: string;
  /** selo "Em breve" e fundos neutros pequenos */
  neutro: string;
}

const CLARO: CoresDoTema = {
  fundo: "#f7f7f7",
  superficie: "#ffffff",
  // o mesmo lilás-acinzentado do mapa claro
  painel: "#ECEEF5",
  cartao: "#ffffff",
  item: "#f9f9f9",
  texto: "#111111",
  textoApoio: "#6B7280",
  textoDesativado: "#9CA3AF",
  borda: "#e5e5e5",
  icone: "#111111",
  veu: "rgba(0,0,0,0.25)",
  neutro: "#ECEDEF",
};

const ESCURO: CoresDoTema = {
  fundo: "#0F1114",
  superficie: "#181B20",
  painel: "#181B20",
  cartao: "#181B20",
  item: "#22262C",
  texto: "#F3F4F6",
  textoApoio: "#A3A9B3",
  textoDesativado: "#6B7280",
  borda: "#2B3037",
  icone: "#F3F4F6",
  veu: "rgba(0,0,0,0.55)",
  neutro: "#2B3037",
};

// Estilo do Google Maps para o modo escuro (Android). No iOS o mapa escurece
// por `userInterfaceStyle`.
type EstiloDoMapa = {
  featureType?: string;
  elementType?: string;
  stylers: Record<string, string>[];
}[];

export const ESTILO_MAPA_ESCURO: EstiloDoMapa = [
  { elementType: "geometry", stylers: [{ color: "#1d2127" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa3ad" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d2127" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#3a414a" }],
  },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#232a31" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7d8791" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1b2a24" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d343c" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1d2127" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#353d46" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3f4852" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b4bcc5" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#262d34" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1822" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#51606e" }],
  },
];

// Mapa claro de fundo lilás-acinzentado, ruas brancas e rodovias azul-acinzentadas
// (como o mapa do motorista da Uber). Poucos comércios: só parques, órgãos
// públicos e os nomes de bairros e ruas, para o mapa não poluir.
const ESTILO_MAPA_CLARO: EstiloDoMapa = [
  { elementType: "geometry", stylers: [{ color: "#ECEEF5" }] },
  // quarteirões e áreas construídas vêm em cinza no mapa padrão: ficam da cor
  // do chão, para o mapa não escurecer nos bairros densos
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#ECEEF5" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.fill",
    stylers: [{ color: "#ECEEF5" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry.stroke",
    stylers: [{ color: "#ECEEF5" }],
  },
  // afastando o zoom, as áreas construídas e o relevo apareciam num cinza mais
  // escuro que o chão. Pintar não resolveu: escondidas, sobra o chão lilás.
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape.natural.terrain",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  { elementType: "labels.text.fill", stylers: [{ color: "#5F6677" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F6F7FB" }] },
  {
    featureType: "administrative.land_parcel",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8A90A6" }],
  },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#E3E6F1" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#DCE8E3" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#2E7D5B" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E1E4EF" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6E768B" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#C3CBE3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#A9B3D3" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#D5E1F3" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8EA0BF" }],
  },
];

interface ContextoDoTema {
  modo: Modo;
  escuro: boolean;
  cores: CoresDoTema;
  alternar: () => void;
  definir: (modo: Modo) => void;
  /** props prontas para o `MapView` */
  mapa: {
    userInterfaceStyle: "light" | "dark";
    customMapStyle: EstiloDoMapa;
  };
}

const Contexto = createContext<ContextoDoTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<Modo>("claro");

  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(CHAVE)
      .then((salvo) => {
        if (ativo && (salvo === "claro" || salvo === "escuro")) setModo(salvo);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const definir = useCallback((novo: Modo) => {
    setModo(novo);
    AsyncStorage.setItem(CHAVE, novo).catch(() => undefined);
  }, []);

  const alternar = useCallback(() => {
    setModo((atual) => {
      const novo: Modo = atual === "escuro" ? "claro" : "escuro";
      AsyncStorage.setItem(CHAVE, novo).catch(() => undefined);
      return novo;
    });
  }, []);

  const valor = useMemo<ContextoDoTema>(() => {
    const escuro = modo === "escuro";
    return {
      modo,
      escuro,
      cores: escuro ? ESCURO : CLARO,
      alternar,
      definir,
      mapa: {
        userInterfaceStyle: escuro ? "dark" : "light",
        // lista vazia (e não undefined): no Android, tirar o estilo escuro com
        // undefined não volta o mapa ao padrão; o estilo vazio força o claro
        customMapStyle: escuro ? ESTILO_MAPA_ESCURO : ESTILO_MAPA_CLARO,
      },
    };
  }, [modo, alternar, definir]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ContextoDoTema {
  const contexto = useContext(Contexto);
  if (!contexto)
    throw new Error("useTema precisa estar dentro do TemaProvider");
  return contexto;
}

// Cores fixas que as telas antigas usam no modo claro e o papel de cada uma no
// modo escuro. Cores de marca (amarelo, laranja, verde) não entram: valem nos dois.
const SUPERFICIES = ["#fff", "#ffffff"];
const FUNDOS = ["#f7f7f7"];
const ITENS = [
  "#f5f5f5",
  "#f9f9f9",
  "#f8f8f8",
  "#f2f3f5",
  "#f3f4f6",
  "#f0f0f0",
  "#eeeeee",
  "#eee",
  "#e5e7eb",
  "#ecedef",
  "#ececee",
  "#f4f4f6",
  "#f3f3f3",
  "#d8d8d8",
];
const TEXTOS = [
  "#111",
  "#111111",
  "#222",
  "#333",
  "#444",
  "#1f1f1f",
  "#2b2b2b",
  "#000",
  "black",
];
const APOIOS = [
  "#555",
  "#666",
  "#777",
  "#888",
  "#999",
  "#9aa0a6",
  "#a0a4a8",
  "#8a8a8f",
  "#9a9aa0",
  "#6b7280",
];
const BORDAS = ["#e5e5e5", "#eee", "#f0f0f0", "#ccc", "#ddd", "#d5d5d5"];

function corNoEscuro(
  propriedade: string,
  valor: string,
  cores: CoresDoTema,
  extras?: ExtrasDoTema,
) {
  const cor = valor.toLowerCase();
  // trocas próprias da tela: "propriedade:cor" vale só para aquela propriedade
  const propria = extras?.[`${propriedade}:${cor}`] ?? extras?.[cor];
  if (propria) return propria;
  const eBorda = propriedade.startsWith("border");
  const eTexto = propriedade === "color";

  if (eBorda) {
    if (BORDAS.includes(cor) || SUPERFICIES.includes(cor)) return cores.borda;
    return valor;
  }
  // texto branco (sobre fundos de marca) já lê bem no escuro
  if (eTexto && SUPERFICIES.includes(cor)) return valor;
  if (SUPERFICIES.includes(cor)) return cores.superficie;
  if (FUNDOS.includes(cor)) return cores.fundo;
  if (ITENS.includes(cor)) return eTexto ? valor : cores.item;
  if (TEXTOS.includes(cor)) return cores.texto;
  if (APOIOS.includes(cor)) return cores.textoApoio;
  return valor;
}

const PROPRIEDADES_DE_COR =
  /^(color|backgroundColor|border(Top|Bottom|Left|Right)?Color)$/;

/** Trocas de cor de uma tela: `"#abc"` ou `"backgroundColor:#abc"` para a cor escura. */
export type ExtrasDoTema = Record<string, string>;

/** Converte as cores fixas de um `StyleSheet` para o modo escuro. */
export function tematizar<T extends Record<string, object>>(
  estilos: T,
  cores: CoresDoTema,
  extras?: ExtrasDoTema,
): T {
  const resultado: Record<string, object> = {};
  for (const [nome, estilo] of Object.entries(estilos)) {
    const novo: Record<string, unknown> = {};
    for (const [propriedade, valor] of Object.entries(estilo)) {
      novo[propriedade] =
        typeof valor === "string" && PROPRIEDADES_DE_COR.test(propriedade)
          ? corNoEscuro(propriedade, valor, cores, extras)
          : valor;
    }
    resultado[nome] = novo;
  }
  return resultado as T;
}

/** Estilos da tela no tema atual: no claro devolve os mesmos estilos. */
export function useEstilos<T extends Record<string, object>>(
  estilos: T,
  extras?: (cores: CoresDoTema) => ExtrasDoTema,
): T {
  const { escuro, cores } = useTema();
  return useMemo(
    () => (escuro ? tematizar(estilos, cores, extras?.(cores)) : estilos),
    [escuro, cores, estilos, extras],
  );
}

/** Tons escuros para avisos, chips e cartões coloridos das telas da corrida. */
export const extrasDaCorrida = (cores: CoresDoTema): ExtrasDoTema => ({
  "#fff4b8": "#3D3320",
  "#fff4c2": "#3D3320",
  "#fff4d6": "#3D3320",
  "#fff4de": "#3D3320",
  "#eaf2fe": "#1B2A44",
  "#eaf2f8": "#1B2A44",
  "#fef3f2": "#3A1D1B",
  "#fdecea": "#3A1D1B",
  "#e2e4e8": cores.item,
  "#e8ebf0": cores.item,
  "#f1f1f2": cores.item,
  "#f0f0f2": cores.item,
  "#e6edf5": cores.item,
  "#f6f7f9": cores.item,
  "#f7f8fa": cores.item,
  "backgroundColor:#ddd": "#4B525C",
  "borderBottomColor:#dadde1": cores.borda,
  "borderBottomColor:#e8e8e8": cores.borda,
  "color:#1959b3": "#7FB0FF",
  "color:#c2410c": "#FB923C",
  "color:#b42318": "#F28B82",
  "color:#8a6d1a": "#E6C46A",
  "color:#5c3b00": "#F2D79A",
  "color:#374151": cores.textoApoio,
  "color:#64748b": cores.textoApoio,
  "color:#252525": cores.texto,
});
