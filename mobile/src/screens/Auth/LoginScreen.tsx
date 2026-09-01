import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

export default function LoginScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: "center" }}>
        <Text style={[typography.h1, { color: theme.primary, marginBottom: spacing.xs }]}>idle</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.xl }]}>
          Everyday work, done by real people nearby.
        </Text>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

        {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

        <Button title="Log In" onPress={handleLogin} loading={loading} disabled={!email || !password} />

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={{ marginTop: spacing.md, alignItems: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Consent")} style={{ marginTop: spacing.lg, alignItems: "center" }}>
          <Text style={[typography.body, { color: theme.textSecondary }]}>
            New to Idle? <Text style={{ color: theme.primary, fontWeight: "600" }}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
