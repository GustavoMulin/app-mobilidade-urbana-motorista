import SplashAnimada from "@/components/common/SplashAnimada";
import { useAuth } from "@/context/AuthProvider";
import { rotaDoMotorista } from "@/domain/rotaDoMotorista";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

const ABERTURA_MS = 1800;

// A abertura toca uma vez por abertura do app. Entrar ou sair da conta tira a
// tela atual da pilha (Stack.Protected) e o app passa de novo por esta rota.
let aberturaConcluida = false;

export default function Index() {
  const { user, loading } = useAuth();
  const [tempoCumprido, setTempoCumprido] = useState(aberturaConcluida);
  const abrindo = !aberturaConcluida && (loading || !tempoCumprido);

  useEffect(() => {
    if (aberturaConcluida) return;

    const fim = setTimeout(() => setTempoCumprido(true), ABERTURA_MS);
    return () => clearTimeout(fim);
  }, []);

  useEffect(() => {
    if (!abrindo) aberturaConcluida = true;
  }, [abrindo]);

  if (abrindo) return <SplashAnimada />;

  // só de passagem, entre telas brancas: sem o branco aqui o fundo escuro piscaria
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      {!loading && (
        <Redirect href={user ? rotaDoMotorista(user.status) : "/login"} />
      )}
    </View>
  );
}
