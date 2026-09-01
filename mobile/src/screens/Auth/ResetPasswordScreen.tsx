import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const [email, setEmail] = useState(route?.params?.email || "");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: { email: email.trim().toLowerCase(), token: token.trim(), newPassword },
        auth: false,
      });
      Alert.alert("Password reset", "You can now log in with your new password.");
      navigation.navigate("Login");
    } catch (e: any) {
      setError(e.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
        <ScreenTitle>Enter your reset code</ScreenTitle>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
          Paste the code from your email, then choose a new password.
        </Text>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Input label="Reset code" value={token} onChangeText={setToken} placeholder="Paste the code from your email" />
        <Input label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry />

        {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

        <Button title="Reset password" onPress={submit} loading={loading} disabled={!email || !token || newPassword.length < 8} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
