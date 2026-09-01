import React, { useState } from "react";
import { View, ScrollView, Alert, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing } from "../../theme/theme";

export default function ChangePasswordScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      Alert.alert("Password changed", "Your password has been updated.");
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Couldn't change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Change password</ScreenTitle>

      <Input label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" secureTextEntry />
      <Input label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry />
      <Input label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry />

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button
        title="Update password"
        onPress={submit}
        loading={loading}
        disabled={!currentPassword || newPassword.length < 8 || !confirmPassword}
      />
    </ScrollView>
  );
}
