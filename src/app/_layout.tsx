// app/_layout.tsx
import { configurarNotificacoes, registrarAparelho } from "@/Services/push";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { ToastProvider } from "@/context/ToastContext";
import "@/styles/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Rotas protegidas: com a sessão aberta, login e cadastro saem da pilha (o
// voltar do celular não cai mais no login); sem sessão, a área logada sai.
configurarNotificacoes();

function Rotas() {
  const { user, loading } = useAuth();
  const logado = Boolean(user);

  // push da corrida: o aparelho é registrado com a sessão aberta
  useEffect(() => {
    if (!user?.id) return;
    let cancelar: () => void = () => undefined;
    let ativo = true;
    void registrarAparelho().then((desfazer) => {
      if (ativo) cancelar = desfazer;
      else desfazer();
    });
    return () => {
      ativo = false;
      cancelar();
    };
  }, [user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#0D0D0D" },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Protected guard={!logado}>
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="loginEmail" options={{ animation: "fade" }} />
        <Stack.Screen name="register" options={{ animation: "fade" }} />
      </Stack.Protected>
      {/* enquanto a sessão é lida do aparelho, a área logada não é tirada
          da pilha (senão o app piscava para o login ao abrir) */}
      <Stack.Protected guard={logado || loading}>
        <Stack.Screen name="liberacao" options={{ animation: "fade" }} />
        <Stack.Screen name="home" options={{ animation: "fade" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <Rotas />
          </GestureHandlerRootView>
        </ToastProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
