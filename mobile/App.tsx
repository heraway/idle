import React from "react";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider } from "./src/context/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

function StatusBarBridge() {
  const { theme } = useTheme();
  return <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StatusBarBridge />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
