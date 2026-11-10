import ErrorBanner from "@/components/common/ErrorBanner";
import { Text } from "@/components/common/Texto";
import TelaDocumentos from "@/components/usuario/TelaDocumentos";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastContext";
import { situacaoNaLiberacao } from "@/domain/situacaoNaLiberacao";
import {
  SituacaoCadastro,
  useCadastroMotorista,
} from "@/hooks/useCadastroMotorista";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const AVISO: Record<
  SituacaoCadastro,
  { titulo: string; texto: string; cor: string }
> = {
  sem_cadastro: {
    titulo: "Falta pouco para você dirigir",
    texto: "Envie seus dados para começarmos a análise.",
    cor: "#E65100",
  },
  pendente: {
    titulo: "Seu cadastro está incompleto",
    texto: "Complete os itens abaixo para entrar na análise.",
    cor: "#E65100",
  },
  em_analise: {
    titulo: "Cadastro em análise",
    texto:
      "Estamos conferindo seus documentos. Avisaremos assim que forem aprovados.",
    cor: "#1565C0",
  },
  reprovado: {
    titulo: "Cadastro reprovado",
    texto: "Confira os documentos recusados e envie novamente.",
    cor: "#D32F2F",
  },
  aprovado: {
    titulo: "Cadastro aprovado",
    texto: "Tudo certo. Você já pode receber corridas.",
    cor: "#17A673",
  },
  // o servidor chama de "ativo" o motorista com todos os documentos aprovados
  ativo: {
    titulo: "Cadastro aprovado",
    texto: "Tudo certo. Você já pode receber corridas.",
    cor: "#17A673",
  },
};

export default function Liberacao() {
  const router = useRouter();
  const { logout } = useAuth();
  const { mostrarToast } = useToast();
  const { cadastro, carregando, enviando, erro, atalhoDev, recarregar } =
    useCadastroMotorista();

  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (
      cadastro?.situacao === "aprovado" ||
      cadastro?.situacao === "ativo" ||
      cadastro?.liberado
    ) {
      router.replace("/home");
    }
  }, [cadastro?.situacao, cadastro?.liberado, router]);

  const sairDaConta = async () => {
    if (saindo) return;
    setSaindo(true);
    await logout();
  };

  // atalhos de desenvolvimento: aprovar com documentos fictícios, ou entrar
  // sem nenhum para ver as ações necessárias na home
  const usarAtalho = async (rota: "aprovar-dev" | "liberar-dev") => {
    if (enviando) return;
    const sucesso = await atalhoDev(rota);

    if (sucesso) {
      mostrarToast({
        tipo: "success",
        titulo:
          rota === "aprovar-dev"
            ? "Cadastro aprovado (atalho de desenvolvimento)"
            : "Entrou sem documentos (atalho de desenvolvimento)",
      });
    }
  };

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color="#FF5500" />
        <Text style={styles.carregandoTexto}>Carregando seu cadastro...</Text>
      </View>
    );
  }

  // de passagem para a home: sem isso a lista piscaria antes
  if (cadastro?.liberado) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <TelaDocumentos
        comCrlv
        cadastro={cadastro}
        aviso={AVISO[situacaoNaLiberacao(cadastro)]}
        onEnviado={() => void recarregar()}
        onAtualizar={recarregar}
      >
        {erro.length > 0 ? <ErrorBanner message={erro} /> : null}

        {__DEV__ &&
          cadastro?.situacao !== "aprovado" &&
          cadastro?.situacao !== "ativo" &&
          (
            [
              ["aprovar-dev", "Pular e aprovar (dev)"],
              ["liberar-dev", "Entrar sem documentos (dev)"],
            ] as const
          ).map(([rota, rotulo]) => (
            <TouchableOpacity
              key={rota}
              onPress={() => void usarAtalho(rota)}
              disabled={enviando || saindo}
              style={styles.acao}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.testClickableText,
                  (enviando || saindo) && styles.testClickableTextDisabled,
                ]}
              >
                {rotulo}
              </Text>
            </TouchableOpacity>
          ))}

        <TouchableOpacity
          style={styles.acao}
          onPress={() => void sairDaConta()}
          disabled={saindo}
        >
          <Text style={styles.sairTexto}>Sair da conta</Text>
        </TouchableOpacity>
      </TelaDocumentos>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  carregando: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  carregandoTexto: { marginTop: 16, fontSize: 14, color: "#666" },
  acao: { paddingVertical: 8, alignItems: "center" },
  testClickableText: {
    fontSize: 13,
    color: "#8A8A8A",
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  testClickableTextDisabled: { color: "#A0A0A0" },
  sairTexto: { fontSize: 15, color: "#888", textDecorationLine: "underline" },
});
