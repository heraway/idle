import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

export default function ForgotPasswordScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email: email.trim().toLowerCase() }, auth: false });
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl, flexGrow: 1, justifyContent: "center" }}>
        <ScreenTitle>Reset your password</ScreenTitle>

        {sent ? (
          <>
            <Text style={[typography.body, { color: theme.textPrimary, marginBottom: spacing.lg }]}>
              If an account exists for <Text style={{ fontWeight: "700" }}>{email}</Text>, we've sent a reset code.
              Check your email, then enter the code on the next screen.
            </Text>
            <Button title="I have a code" onPress={() => navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() })} />
          </>
        ) : (
          <>
            <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
              Enter the email on your account and we'll send you a code to reset your password.
            </Text>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}
            <Button title="Send reset code" onPress={submit} loading={loading} disabled={!email} />
          </>
        )}

        <Button title="Back to log in" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
