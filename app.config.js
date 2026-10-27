/* global __dirname */
// CODEX: 3 linhas adicionadas e 3 removidas; atualiza o nome Expo do motorista. Remover após validação/commit.
const fs = require("fs");
const path = require("path");

function lerEnv(nome) {
  if (process.env[nome]) return process.env[nome];

  const arquivo = path.join(__dirname, ".env");

  if (!fs.existsSync(arquivo)) return "";

  const linha = fs
    .readFileSync(arquivo, "utf8")
    .split("\n")
    .find((l) => l.trim().startsWith(`${nome}=`));

  return linha ? linha.slice(linha.indexOf("=") + 1).trim() : "";
}

const ehDesenvolvimento = process.env.APP_VARIANT !== "production" && process.env.EAS_BUILD_PROFILE !== "production";
const googleMapsAndroidKey = lerEnv("GOOGLE_MAPS_ANDROID_KEY");
// CODEX: preserve o identificador do APK já instalado ao informá-lo no ambiente de build.
const androidAppPackage = lerEnv("ANDROID_APP_PACKAGE") || "com.lmardark.aplicativomobilidadeurbanamotorista";
const iosAppBundleId = lerEnv("IOS_APP_BUNDLE_ID");
// push (Firebase): o google-services.json do projeto Firebase, baixado no
// console para o pacote deste app. Sem ele o app funciona, só não recebe push.
const googleServicesFile =
  lerEnv("GOOGLE_SERVICES_FILE") ||
  (fs.existsSync(path.join(__dirname, "google-services.json"))
    ? "./google-services.json"
    : "");

if (!ehDesenvolvimento && process.env.EAS_BUILD_PLATFORM !== "ios" && !googleMapsAndroidKey) {
  throw new Error("GOOGLE_MAPS_ANDROID_KEY é obrigatória no build Android de produção.");
}
if (!ehDesenvolvimento && process.env.EAS_BUILD_PLATFORM !== "ios" && !androidAppPackage) {
  throw new Error("ANDROID_APP_PACKAGE precisa corresponder ao pacote do APK já instalado antes do build de produção.");
}
if (!ehDesenvolvimento && process.env.EAS_BUILD_PLATFORM === "ios" && !iosAppBundleId) {
  throw new Error("IOS_APP_BUNDLE_ID precisa corresponder ao identificador do aplicativo iOS já instalado.");
}

module.exports = {
  name: "69",
  slug: "aplicativo-mobilidade-urbana-motorista",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "p6driverfrontend",

  userInterfaceStyle: "automatic",

  ios: {
    ...(iosAppBundleId ? { bundleIdentifier: iosAppBundleId } : {}),
    supportsTablet: true,
  },

  android: {
    ...(googleServicesFile ? { googleServicesFile } : {}),
    ...(androidAppPackage ? { package: androidAppPackage } : {}),
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: { apiKey: googleMapsAndroidKey },
    },
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    [
      "expo-notifications",
      {
        icon: "./assets/images/android-icon-monochrome.png",
        color: "#FFD600",
        defaultChannel: "corridas",
      },
    ],
    "expo-router",
    ["react-native-maps", { androidGoogleMapsApiKey: googleMapsAndroidKey }],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Permitir $(PRODUCT_NAME) usar sua localização.",
        locationAlwaysPermission:
          "Permitir $(PRODUCT_NAME) usar sua localização.",
        locationWhenInUsePermission:
          "Permitir $(PRODUCT_NAME) usar sua localização.",
      },
    ],
    "expo-font",
    "expo-status-bar",
    "expo-web-browser",
    "expo-audio",
    // CODEX: 2 linhas alteradas neste arquivo; habilita fotos com descrição em português no iPhone.
    ["expo-image-picker", { photosPermission: "Permitir selecionar fotos dos seus documentos para análise." }],
    "expo-asset",
    "expo-secure-store",

    ...(ehDesenvolvimento
      ? [["expo-build-properties", { android: { usesCleartextTraffic: true } }]]
      : []),
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "d23deb09-3d3b-4b7b-a047-fceebc048084"
    }
  }
};
