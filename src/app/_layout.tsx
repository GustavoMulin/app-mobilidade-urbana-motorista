// app/_layout.tsx
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { ToastProvider } from "@/context/ToastContext";
import "@/styles/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Rotas protegidas: com a sessão aberta, login e cadastro saem da pilha (o
// voltar do celular não cai mais no login); sem sessão, a área logada sai.
function Rotas() {
  const { user, loading } = useAuth();
  const logado = Boolean(user);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "black" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
          headerTitle: () => (
            <Image source={require("../../assets/images/logo.png")} />
          ),
        }}
      />
      <Stack.Protected guard={!logado}>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="loginEmail"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>
      {/* enquanto a sessão é lida do aparelho, a área logada não é tirada
          da pilha (senão o app piscava para o login ao abrir) */}
      <Stack.Protected guard={logado || loading}>
        <Stack.Screen
          name="liberacao"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            headerShown: false,
          }}
        />
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
