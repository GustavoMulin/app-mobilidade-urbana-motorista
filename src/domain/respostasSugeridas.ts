// Respostas rápidas que mudam conforme a conversa: o que o outro acabou de
// escrever, o que eu mesmo disse por último e a etapa da corrida. É uma
// "inteligência" simples por palavras-chave, sem servidor.

export type Perfil = "motorista" | "passageiro";

interface MensagemResumo {
  conteudo: string;
  minha: boolean;
}

interface Regra {
  gatilho: RegExp;
  respostas: string[];
  // vale também com o passageiro já no carro; as outras são do embarque
  naViagem?: boolean;
}

const normalizar = (texto: string) =>
  texto.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

// o que responder quando a última mensagem é do outro
const RESPONDER: Record<Perfil, Regra[]> = {
  motorista: [
    {
      gatilho: /esper|aguard|minut|demor|segura/,
      respostas: [
        "Sem problemas, eu aguardo",
        "Estou te aguardando aqui",
        "Posso esperar alguns minutos",
      ],
    },
    {
      gatilho: /descend|saindo|to indo|estou indo|ja vou|indo pro|indo para/,
      respostas: ["Ok, te aguardo", "Sem pressa", "Estou no local de embarque"],
    },
    {
      gatilho: /onde|cade|localiza|chegando|falta|quanto tempo/,
      respostas: [
        "Estou a caminho",
        "Chego em poucos minutos",
        "Já estou chegando",
      ],
    },
    {
      gatilho: /cheguei|no local|ja estou|estou aqui|na frente|esquina/,
      respostas: ["Estou chegando", "Já te vi!", "Qual a cor da sua roupa?"],
    },
    {
      gatilho: /mala|bagage|porta.?malas|cachorro|pet|animal|crianca/,
      respostas: ["Sem problemas", "Tudo bem, tem espaço", "Pode trazer"],
    },
    {
      gatilho: /\bar\b|janela|musica|radio|parar|parada/,
      respostas: ["Claro!", "Sem problemas", "Um momento"],
      naViagem: true,
    },
    {
      gatilho: /obrigad|valeu|agradec/,
      respostas: ["Por nada!", "Boa viagem!", "Disponha!"],
      naViagem: true,
    },
    { gatilho: /\?$/, respostas: ["Sim", "Não", "Um momento"], naViagem: true },
  ],
  passageiro: [
    {
      gatilho: /cheguei|no local|aguardando|embarque|estou aqui|te espero/,
      respostas: [
        "Já estou descendo",
        "Estou indo",
        "Pode me esperar um pouco?",
      ],
    },
    {
      gatilho: /nao te encontrei|onde|cade|localiza|roupa/,
      respostas: [
        "Estou no local de embarque",
        "Estou chegando",
        "Pode me ligar?",
      ],
    },
    {
      gatilho: /transito|atras|demor|desculp/,
      respostas: ["Sem problemas", "Ok, aguardo", "Tudo bem"],
      naViagem: true,
    },
    {
      gatilho: /caminho|chegando|chego|minutos/,
      respostas: ["Ok, obrigado!", "Estou aguardando", "Já estou no local"],
    },
    {
      gatilho: /obrigad|valeu|boa viagem/,
      respostas: ["Obrigado!", "Valeu!", "Até mais!"],
      naViagem: true,
    },
    { gatilho: /\?$/, respostas: ["Sim", "Não", "Um momento"], naViagem: true },
  ],
};

// continuação natural do que eu mesmo acabei de dizer
const CONTINUAR: Record<Perfil, Regra[]> = {
  motorista: [
    {
      gatilho: /a caminho|chegando|chego/,
      respostas: [
        "Estou preso no trânsito",
        "Cheguei ao embarque",
        "Chego em poucos minutos",
      ],
    },
    {
      gatilho: /cheguei|no local|aguardando/,
      respostas: [
        "Estou com o pisca-alerta ligado",
        "Não te encontrei. Onde você está?",
        "Estou te aguardando",
      ],
    },
    {
      gatilho: /transito/,
      respostas: ["Chego em poucos minutos", "Desculpe a demora"],
    },
  ],
  passageiro: [
    {
      gatilho: /descendo|estou indo|indo para/,
      respostas: ["Estou quase aí", "Já estou chegando"],
    },
    {
      gatilho: /esperar/,
      respostas: ["Obrigado!", "Já estou indo"],
    },
  ],
};

const POR_ETAPA: Record<Perfil, Record<string, string[]>> = {
  motorista: {
    aceita: [
      "Estou a caminho",
      "Chego em poucos minutos",
      "Estou preso no trânsito",
    ],
    motorista_chegou: [
      "Cheguei ao embarque",
      "Estou te aguardando",
      "Não te encontrei. Onde você está?",
    ],
    em_andamento: ["Estamos quase chegando", "Obrigado!"],
  },
  passageiro: {
    aceita: [
      "Estou indo para o embarque",
      "Já estou no local",
      "Pode me esperar um pouco?",
    ],
    motorista_chegou: [
      "Já estou descendo",
      "Estou indo",
      "Pode me esperar um pouco?",
    ],
    em_andamento: ["Obrigado!", "Pode ligar o ar?"],
  },
};

const LIMITE = 3;

export function sugerirRespostas(
  perfil: Perfil,
  etapa: string | null | undefined,
  mensagens: MensagemResumo[],
): string[] {
  const ultima = mensagens[mensagens.length - 1];
  const texto = ultima ? normalizar(ultima.conteudo) : "";
  // com o passageiro no carro, conversa do embarque ("já estou descendo") não
  // puxa mais sugestão
  const naViagem = etapa === "em_andamento";
  const regras = (ultima?.minha ? CONTINUAR[perfil] : RESPONDER[perfil]).filter(
    (regra) => !naViagem || regra.naViagem,
  );
  const casou = ultima
    ? regras.find((regra) => regra.gatilho.test(texto))?.respostas
    : undefined;

  const doPadrao = POR_ETAPA[perfil][etapa ?? ""] ?? POR_ETAPA[perfil].aceita;
  const jaDitas = new Set(
    mensagens
      .filter((item) => item.minha)
      .map((item) => normalizar(item.conteudo)),
  );

  const escolhidas: string[] = [];
  for (const resposta of [...(casou ?? []), ...doPadrao]) {
    const chave = normalizar(resposta);
    if (
      jaDitas.has(chave) ||
      escolhidas.some((item) => normalizar(item) === chave)
    )
      continue;
    escolhidas.push(resposta);
    if (escolhidas.length === LIMITE) break;
  }
  return escolhidas;
}
