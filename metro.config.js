const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)
// os modelos do aceitar por gesto (assets/modelos/*.tflite) vão no bundle como asset
config.resolver.assetExts.push("tflite")

module.exports = withNativeWind(config, { input: './src/styles/global.css' })