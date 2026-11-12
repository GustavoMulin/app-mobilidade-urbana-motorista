// O react-native-vision-camera-resizer (aceitar corrida por gesto) lê no Android
// o shader Vulkan já compilado em assets/shaders/Resizer.comp.spv. O Android
// Gradle Plugin só gera esse arquivo com buildFeatures.shaders, que vem
// desligado e ainda exige o glslc.dir de cada máquina. Como o SPIR-V não depende
// de máquina, ele fica versionado em assets/shaders e é copiado para os assets
// do app no prebuild. Ao atualizar o resizer, gere de novo com o glslc do NDK:
//   <ndk>/shader-tools/<host>/glslc -O --target-env=vulkan1.0 \
//     node_modules/react-native-vision-camera-resizer/android/src/main/shaders/Resizer.comp \
//     -o assets/shaders/Resizer.comp.spv
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withShaderDoResizer(config) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const destino = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/assets/shaders",
      );
      fs.mkdirSync(destino, { recursive: true });
      fs.copyFileSync(
        path.join(
          mod.modRequest.projectRoot,
          "assets/shaders/Resizer.comp.spv",
        ),
        path.join(destino, "Resizer.comp.spv"),
      );
      return mod;
    },
  ]);
};
