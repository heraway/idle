import React, { useState } from "react";
import { Text, ScrollView, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { Button, Card, Input, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await api("/users/me", { method: "DELETE", body: { password } });
      await logout();
      // RootNavigator swaps to the login screen once the user is cleared.
    } catch (e: any) {
      setError(e.message || "Couldn't delete your account");
      setLoading(false);
    }
  };

  const confirm = () =>
    Alert.alert("Delete your account?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: doDelete },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <ScreenTitle>Delete account</ScreenTitle>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.bodyBold, { color: theme.textPrimary, marginBottom: spacing.sm }]}>What happens</Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {"•  Your name, photo, bio, links, location, phone and email are removed and you're signed out everywhere.\n"}
          {"•  Jobs you posted that are still open are cancelled, and your pending bids are withdrawn.\n"}
          {"•  Messages, ratings and job history that involve other people stay, shown under \"Deleted User\", so their records aren't broken.\n"}
          {"•  You can't delete while you have a job that is assigned, in progress, awaiting confirmation or in dispute — finish or resolve it first.\n"}
          {"•  You can register again later with the same email, but your old account can't be recovered."}
        </Text>
      </Card>

      <Input label="Confirm with your password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}
      <Button title="Delete my account" variant="danger" onPress={confirm} loading={loading} disabled={!password} />
    </ScrollView>
  );
}
