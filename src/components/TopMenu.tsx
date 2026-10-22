import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface TopMenuProps {
  onMenuPress: () => void;
}

export default function TopMenu({ onMenuPress }: TopMenuProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.topMenuWrapper}>
      <View style={styles.topMenu}>
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          accessibilityLabel="Abrir menu"
        >
          <Ionicons name="menu" size={26} color="#111" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topMenuWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  topMenu: {
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 50,
    elevation: 4,
    shadowRadius: 4,
    width: 48,
    height: 48,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
  },
  iconButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
