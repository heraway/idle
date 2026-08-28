import React from "react";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

function StatusBarBridge() {
  const { theme } = useTheme();
  return <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />;
}

// Invisible portfolio watermark: zero-size, zero-opacity, and hidden from
// screen readers, so it never affects layout or accessibility — it just
// exists in the shipped bundle to identify this build as the original.
function BuildSignature() {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
    >
      heraway
    </Text>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBarBridge />
        <BuildSignature />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
