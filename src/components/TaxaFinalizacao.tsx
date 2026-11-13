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
  avisoDaSituacaoTaxa,
  rotuloDia,
  rotuloPeriodo,
  textoDuracoes,
  type DetalheFinalizacao,
} from "@/domain/taxaFinalizacao";
import { useDetalheDaTaxa } from "@/hooks/useDetalheDaTaxa";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

type ModoHistorico = "janela" | "diaria";

/** Tela Taxa de Finalização: medidor, dados diários, regras e histórico. */
export default function TaxaFinalizacao({ visible, onClose, duration }: Props) {
  const { dados, erro } = useDetalheDaTaxa<DetalheFinalizacao>(
    visible,
    "/motorista/me/taxa-finalizacao",
  );
  const [tela, setTela] = useState<"resumo" | "historico">("resumo");
  const [aba, setAba] = useState<Aba>("corridas");
  const [modo, setModo] = useState<ModoHistorico>("janela");
  const [diaEscolhido, setDiaEscolhido] = useState<number | null>(null);
  const [abertas, setAbertas] = useState({
    diario: true,
    afeta: true,
    oQueE: true,
    quando: true,
    recuperar: true,
  });

  const alternar = (chave: keyof typeof abertas) =>
    setAbertas((atuais) => ({ ...atuais, [chave]: !atuais[chave] }));

  const aoFechar = useCallback(() => {
    setTela("resumo");
    setDiaEscolhido(null);
  }, []);

  const aviso = avisoDaSituacaoTaxa(dados?.situacao_taxa);
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
      <Text style={styles.tituloPagina}>Últimos 30 dias</Text>
      <Text style={styles.periodo}>
        {rotuloPeriodo(dados.periodo.de, dados.periodo.ate)}
      </Text>

      {aviso ? (
        <View style={styles.aviso}>
          <Ionicons name="warning" size={18} color="#B3261E" />
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </View>
      ) : null}

      <View style={styles.cartao}>
        <MedidorTaxa taxa={dados.taxa} minima={dados.minima} />
        <View style={styles.mensagem}>
          <Text style={styles.mensagemTexto}>
            Mantenha esse valor acima de {dados.minima}% para ter acesso
            ininterrupto às corridas.
          </Text>
        </View>
        <LinhaDeContagem
          rotulo="Corridas finalizadas"
          valor={dados.finalizadas}
        />
        <LinhaDeContagem
          rotulo="Corridas canceladas"
          valor={dados.canceladas}
        />
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
            minima={dados.minima}
            selecionado={indiceDoDia}
            onSelecionar={setDiaEscolhido}
          />
          <LinhaDeContagem
            rotulo="Corridas finalizadas"
            valor={dia?.finalizadas ?? 0}
          />
          <LinhaDeContagem
            rotulo="Corridas canceladas"
            valor={dia?.canceladas ?? 0}
          />
        </View>
      </Secao>

      <Text style={[styles.tituloSecao, styles.tituloSolto]}>
        Como a TF afeta você
      </Text>
      <View style={styles.cartao}>
        <Secao
          titulo="Afeta sua capacidade de receber chamadas"
          aberta={abertas.afeta}
          onAlternar={() => alternar("afeta")}
        >
          <Text style={styles.explicacao}>
            Você pode perder a capacidade de aceitar solicitações por{" "}
            {textoDuracoes(dados.regras.duracoes_dias)} se sua Taxa de
            Finalização (TF) de corridas ficar abaixo de {dados.minima}% até o
            dia {dados.regras.prazo_dia} do mês. Antes disso você recebe um
            alerta e pode recuperar a taxa finalizando as corridas que aceitar.
            A cada mês seguinte sem recuperar, a restrição aumenta.
          </Text>
        </Secao>
      </View>

      <Text style={[styles.tituloSecao, styles.tituloSolto]}>
        Mais informações
      </Text>
      <View style={styles.cartao}>
        <Secao
          titulo="1. O que é a Taxa de Finalização (TF)?"
          aberta={abertas.oQueE}
          onAlternar={() => alternar("oQueE")}
        >
          <Text style={styles.explicacao}>
            A TF é a porcentagem de corridas finalizadas do total de corridas
            aceitas nos últimos 30 dias.{"\n"}
            Por exemplo: se sua Taxa de Finalização (TF) for 90%, significa que
            você cancelou 10% das corridas que aceitou.
          </Text>
        </Secao>
        <Secao
          titulo="2. Quando a Taxa de Finalização (TF) é afetada?"
          aberta={abertas.quando}
          onAlternar={() => alternar("quando")}
        >
          <Text style={styles.explicacao}>
            Se você cancelar uma corrida por qualquer motivo após aceitá-la, sua
            TF será afetada. Desistir de uma corrida em grupo depois de aceitar
            também afeta.{"\n"}
            Não afetam sua TF os cancelamentos feitos pelo passageiro ou pelo
            sistema, nem quando o passageiro não aparece no embarque.
          </Text>
        </Secao>
        <Secao
          titulo="3. Como recuperar minha TF?"
          aberta={abertas.recuperar}
          onAlternar={() => alternar("recuperar")}
        >
          <Text style={styles.explicacao}>
            Finalize as corridas que você aceitar: cada corrida finalizada sobe
            a taxa, e os cancelamentos deixam de contar depois de 30 dias.
            Aceite só as corridas que tem certeza de que poderá concluir.
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
            ["janela", "Últimos 30 dias"],
            ["diaria", "Diária"],
          ] as const
        }
        valor={modo}
        onChange={setModo}
      />
      {modo === "janela"
        ? dados.historico.map((janela) => (
            <ItemDeHistorico
              key={janela.ate}
              rotulo={rotuloPeriodo(janela.de, janela.ate, "-")}
              valor={`${janela.taxa}%`}
            />
          ))
        : [...dados.diario]
            .reverse()
            .map((item) => (
              <ItemDeHistorico
                key={item.data}
                rotulo={rotuloDia(item.data)}
                detalhe={`${item.finalizadas} finalizadas · ${item.canceladas} canceladas`}
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
      titulo="Taxa de Finalização"
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
