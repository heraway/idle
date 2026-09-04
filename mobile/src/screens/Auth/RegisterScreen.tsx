import React, { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing } from "../../theme/theme";

export default function RegisterScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { register } = useAuth();
  const acceptedTerms = route?.params?.acceptedTerms === true;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!acceptedTerms) {
      setError("Please review and accept the Terms of Service first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({ email: email.trim().toLowerCase(), password, firstName, lastName, acceptedTerms: true });
    } catch (e: any) {
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
        <TouchableOpacity
          onPress={() => (navigation?.canGoBack() ? navigation.goBack() : navigation?.navigate("Login"))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginBottom: spacing.md }}
        >
          <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 15 }}>{"‹ Back"}</Text>
        </TouchableOpacity>

        <ScreenTitle>Create your account</ScreenTitle>

        <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" />
        <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Enter your last name" />
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md }}>
          Please use your real name. Idle relies on verified identities to keep hirers and workers accountable to
          each other. Once you're signed in, head to Settings › Verification to upload ID and get a verified badge —
          it's optional, but jobs that require it will only accept bids from verified users.
        </Text>

        <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />

        {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={!firstName || !lastName || !email || password.length < 8}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
