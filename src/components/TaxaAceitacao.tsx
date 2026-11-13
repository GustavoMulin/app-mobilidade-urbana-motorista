import Carregando3D from "@/components/common/Carregando3D";
import { Text } from "@/components/common/Texto";
import MedidorTaxa from "@/components/MedidorTaxa";
import {
  Chips,
  GraficoDiario,
  ItemDeHistorico,
  LinhaDeContagem,
  Secao,
  type Aba,
} from "@/components/taxa/ComponentesTaxa";
import { estilosTaxa as styles } from "@/components/taxa/estilosTaxa";
import PainelDeTaxa from "@/components/taxa/PainelDeTaxa";
import {
  rotuloDia,
  rotuloPeriodo,
  tempoPorExtenso,
  type DetalheAceitacao,
} from "@/domain/taxaFinalizacao";
import { useDetalheDaTaxa } from "@/hooks/useDetalheDaTaxa";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

type ModoHistorico = "mensal" | "diaria";

/** Tela Taxa de Aceitação: taxa do mês, dados diários, regras e histórico. */
export default function TaxaAceitacao({ visible, onClose, duration }: Props) {
  const { dados, erro } = useDetalheDaTaxa<DetalheAceitacao>(
    visible,
    "/motorista/me/taxa-aceitacao",
  );
  const [tela, setTela] = useState<"resumo" | "historico">("resumo");
  const [aba, setAba] = useState<Aba>("corridas");
  const [modo, setModo] = useState<ModoHistorico>("mensal");
  const [diaEscolhido, setDiaEscolhido] = useState<number | null>(null);
  const [abertas, setAbertas] = useState({
    diario: true,
    oQueE: true,
    naoAfeta: true,
  });

  const alternar = (chave: keyof typeof abertas) =>
    setAbertas((atuais) => ({ ...atuais, [chave]: !atuais[chave] }));

  const aoFechar = useCallback(() => {
    setTela("resumo");
    setDiaEscolhido(null);
  }, []);

  const indiceDoDia = dados
    ? Math.min(diaEscolhido ?? dados.diario.length - 1, dados.diario.length - 1)
    : 0;
  const dia = dados?.diario[indiceDoDia];

  const carregando = (
    <View style={styles.centralizado}>
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : (
        <Carregando3D tamanho={36} cor="#FFB800" />
      )}
    </View>
  );

  const resumo = dados ? (
    <>
      <Text style={styles.tituloPagina}>Este mês</Text>
      <Text style={styles.periodo}>
        {rotuloPeriodo(dados.periodo.de, dados.periodo.ate)}
      </Text>

      <View style={styles.cartao}>
        <MedidorTaxa taxa={dados.taxa} />
        <LinhaDeContagem rotulo="Corridas aceitas" valor={dados.aceitas} />
        <LinhaDeContagem rotulo="Corridas recusadas" valor={dados.recusadas} />
      </View>

      <Secao
        grande
        titulo="Dados diários"
        aberta={abertas.diario}
        onAlternar={() => alternar("diario")}
      >
        <View style={styles.cartao}>
          <GraficoDiario
            dias={dados.diario}
            selecionado={indiceDoDia}
            onSelecionar={setDiaEscolhido}
          />
          <LinhaDeContagem
            rotulo="Corridas aceitas"
            valor={dia?.aceitas ?? 0}
          />
          <LinhaDeContagem
            rotulo="Corridas recusadas"
            valor={dia?.recusadas ?? 0}
          />
        </View>
      </Secao>

      <Text style={[styles.tituloSecao, styles.tituloSolto]}>
        Mais informações
      </Text>
      <View style={styles.cartao}>
        <Secao
          titulo="O que é a Taxa de Aceitação (TA)?"
          aberta={abertas.oQueE}
          onAlternar={() => alternar("oQueE")}
        >
          <Text style={styles.explicacao}>
            A Taxa de Aceitação (TA) é a porcentagem de chamadas que você
            aceitou do total que tocaram na sua tela no mês. Toda chamada que
            toca e não é aceita, seja recusada ou deixada tocar até o fim, reduz
            a taxa. Ela começa em 100% e é recalculada a cada chamada.
            {"\n"}
            Por exemplo: se você aceitou 90 chamadas e deixou de aceitar 10 no
            mês, sua TA seria de 90%.
          </Text>
        </Secao>
        <Secao
          titulo="Quando a TA não é afetada?"
          aberta={abertas.naoAfeta}
          onAlternar={() => alternar("naoAfeta")}
        >
          <Text style={styles.explicacao}>
            Não aceitar uma chamada não afeta sua TA nos seguintes casos:
            {"\n"}· Corridas da categoria Negocia, em que o valor pode ser
            negociado com o passageiro, mesmo quando o passageiro escolhe você.
            {"\n"}· Chamada duplicada: a mesma solicitação reenviada para você
            em até {dados.regras.duplicada_janela_minutos}{" "}
            {dados.regras.duplicada_janela_minutos === 1 ? "minuto" : "minutos"}
            .{"\n"}· Quando o passageiro cancela a corrida em até{" "}
            {tempoPorExtenso(dados.regras.cancelamento_passageiro_segundos)}{" "}
            depois de a chamada tocar para você.
          </Text>
        </Secao>
      </View>
    </>
  ) : (
    carregando
  );

  const historico = dados ? (
    <>
      <Chips
        opcoes={
          [
            ["mensal", "Mensal"],
            ["diaria", "Diária"],
          ] as const
        }
        valor={modo}
        onChange={setModo}
      />
      {modo === "mensal"
        ? dados.historico.map((mes) => (
            <ItemDeHistorico
              key={mes.mes}
              rotulo={rotuloPeriodo(mes.de, mes.ate, "-")}
              detalhe={`${mes.aceitas} aceitas · ${mes.recusadas} recusadas`}
              valor={`${mes.taxa}%`}
            />
          ))
        : [...dados.diario]
            .reverse()
            .map((item) => (
              <ItemDeHistorico
                key={item.data}
                rotulo={rotuloDia(item.data)}
                detalhe={`${item.aceitas} aceitas · ${item.recusadas} recusadas`}
                valor={item.taxa === null ? "—" : `${item.taxa}%`}
              />
            ))}
    </>
  ) : (
    carregando
  );

  return (
    <PainelDeTaxa
      visible={visible}
      onClose={onClose}
      duration={duration}
      titulo="Taxa de Aceitação"
      emHistorico={tela === "historico"}
      onAbrirHistorico={() => setTela("historico")}
      onVoltarDoHistorico={() => setTela("resumo")}
      aba={aba}
      onMudarAba={setAba}
      onFechado={aoFechar}
    >
      {tela === "historico" ? historico : resumo}
    </PainelDeTaxa>
  );
}
