import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Text } from "@/components/common/Texto";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import RequisitoEnvioDocumentoDigital from "./RequisitoEnvioDocumentoDigital";
import RequisitoEnvioDocumentoFisico from "./RequisitoEnvioDocumentoFisico";

const { width } = Dimensions.get("window");

interface props {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

interface OptionProps {
  id: string;
  title: string;
  description: string;
  image: string;
  selected: string | null;
  onSelect: (id: string) => void;
}

const Option = ({
  id,
  title,
  description,
  image,
  selected,
  onSelect,
}: OptionProps) => {
  const isSelected = selected === id;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.optionCard}
      onPress={() => onSelect(id)}
    >
      <Image source={{ uri: image }} style={styles.optionImage} />

      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>

      <View style={[styles.radio, isSelected && styles.radioSelected]}>
        {isSelected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
};

export default function EnviarDocumentoVeiculo({
  visible,
  onClose,
  duration = 200,
}: props) {
  const insets = useSafeAreaInsets();
  const [translateX] = useState(() => new Animated.Value(width));
  const [overlayOpacity] = useState(() => new Animated.Value(0));
  const [isMounted, setIsMounted] = useState(visible);

  const [selected, setSelected] = useState<string | null>(null);
  const [
    showRequisitoEnvioDocumentoFisico,
    setShowRequisitoEnvioDocumentoFisico,
  ] = useState(false);
  const [
    showRequisitoEnvioDocumentoDigital,
    setShowRequisitoEnvioDocumentoDigital,
  ] = useState(false);

  const documentoSelecionando = () => {
    if (selected === "fisico") {
      setShowRequisitoEnvioDocumentoFisico(true);
    }
    if (selected === "digital") {
      setShowRequisitoEnvioDocumentoDigital(true);
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsMounted(true), 0);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: width,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => finished && setIsMounted(false));
    }
  }, [visible, duration, translateX, overlayOpacity]);

  if (!isMounted) return null;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { zIndex: 30 }]}>
        {/* Overlay */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.25)", opacity: overlayOpacity },
            ]}
          />
        </Pressable>

        {/* Drawer */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          {/* HEADER */}
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 12, 45) },
            ]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="arrow-back-outline" size={26} color="#111" />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Veículo</Text>

              <View style={{ width: 26 }} />
            </View>
          </View>

          {/* BODY */}
          <View style={styles.body}>
            <Text style={styles.title}>Faça o envio do seu CRLV</Text>

            <Text style={styles.subtitle}>
              Agora aceitamos o envio do documento físico e também digital, em
              PDF
            </Text>

            <Option
              id="fisico"
              title="Documento físico"
              description="Selecione esta opção se você tiver o CRLV físico"
              image="https://cdn-icons-png.flaticon.com/512/337/337946.png"
              selected={selected}
              onSelect={setSelected}
            />

            <Option
              id="digital"
              title="Documento digital (somente PDF)"
              description="Selecione esta opção se você tiver o CRLV digital em PDF"
              image="https://cdn-icons-png.flaticon.com/512/337/337932.png"
              selected={selected}
              onSelect={setSelected}
            />
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <TouchableOpacity
              disabled={!selected}
              style={[styles.button, !selected && { opacity: 0.5 }]}
              onPress={() => {
                documentoSelecionando();
                console.log("Selecionado:", selected);
              }}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      <RequisitoEnvioDocumentoFisico
        visible={showRequisitoEnvioDocumentoFisico}
        onClose={() => setShowRequisitoEnvioDocumentoFisico(false)}
      />
      <RequisitoEnvioDocumentoDigital
        visible={showRequisitoEnvioDocumentoDigital}
        onClose={() => setShowRequisitoEnvioDocumentoDigital(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "100%",
    backgroundColor: "#f7f7f7",
  },

  header: {
    backgroundColor: "#fff",
    paddingTop: 45,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: "#e5e5e5",
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },

  body: {
    flex: 1,
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },

  optionImage: {
    width: 40,
    height: 40,
    marginRight: 12,
    resizeMode: "contain",
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },

  optionDesc: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#FFD600",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFD600",
  },

  footer: {
    padding: 16,
    backgroundColor: "#fff",
  },

  button: {
    backgroundColor: "#FFD600",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
});
