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
export const ESTILO_MAPA_ESCURO = [
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

const ESTILO_MAPA_CLARO: typeof ESTILO_MAPA_ESCURO = [];

interface ContextoDoTema {
  modo: Modo;
  escuro: boolean;
  cores: CoresDoTema;
  alternar: () => void;
  definir: (modo: Modo) => void;
  /** props prontas para o `MapView` */
  mapa: {
    userInterfaceStyle: "light" | "dark";
    customMapStyle: typeof ESTILO_MAPA_ESCURO;
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
