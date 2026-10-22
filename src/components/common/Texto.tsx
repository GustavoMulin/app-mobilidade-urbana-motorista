// CODEX: 14 linhas alteradas neste arquivo; reduz a tipografia global com limite seguro de acessibilidade.
import { forwardRef } from "react";
import {
  Platform,
  StyleSheet,
  Text as TextDoRN,
  TextInput as TextInputDoRN,
  TextInputProps,
  TextProps,
  TextStyle,
} from "react-native";

// Teto para o quanto o texto cresce com a preferência de fonte do sistema.
// Em 1 o app ignoraria a acessibilidade; sem teto, um aparelho com fonte
// grande estoura o layout.
export const ESCALA_MAXIMA_FONTE = 1.1;

// Redução visual uniforme pedida para o aplicativo do motorista.
export const FATOR_FONTE_GLOBAL = 0.9;

// A Roboto (Android) tem altura-de-x maior que a SF Pro (iOS), então o mesmo
// fontSize aparece maior no Android. Este fator compensa a diferença.
export const FATOR_FONTE_ANDROID = 0.94;

const ajustarFonte = <T,>(style: T): T => {
  const achatado = StyleSheet.flatten(style as never) as TextStyle | undefined;
  const tamanho = achatado?.fontSize;

  if (typeof tamanho !== "number") return style;

  const entrelinha = achatado?.lineHeight;
  const fator =
    FATOR_FONTE_GLOBAL * (Platform.OS === "android" ? FATOR_FONTE_ANDROID : 1);

  return [
    style,
    {
      fontSize: tamanho * fator,
      ...(typeof entrelinha === "number"
        ? { lineHeight: entrelinha * fator }
        : {}),
    },
  ] as T;
};

export type Text = TextDoRN;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const Text = forwardRef<TextDoRN, TextProps>(
  ({ maxFontSizeMultiplier, style, ...resto }, ref) => (
    <TextDoRN
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? ESCALA_MAXIMA_FONTE}
      style={ajustarFonte(style)}
      {...resto}
    />
  ),
);

Text.displayName = "Text";

export type TextInput = TextInputDoRN;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const TextInput = forwardRef<TextInputDoRN, TextInputProps>(
  ({ maxFontSizeMultiplier, style, ...resto }, ref) => (
    <TextInputDoRN
      ref={ref}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? ESCALA_MAXIMA_FONTE}
      style={ajustarFonte(style)}
      {...resto}
    />
  ),
);

TextInput.displayName = "TextInput";
