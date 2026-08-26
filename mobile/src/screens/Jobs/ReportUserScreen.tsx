import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Input, ScreenTitle } from "../../components/UI";
import { spacing, radius } from "../../theme/theme";

const REASONS = [
  { key: "UNSAFE_CONDITIONS", label: "Unsafe conditions" },
  { key: "NO_SHOW", label: "No-show" },
  { key: "HARASSMENT", label: "Harassment" },
  { key: "FRAUD", label: "Fraud" },
  { key: "PAYMENT_ISSUE", label: "Payment issue" },
  { key: "POOR_QUALITY", label: "Poor quality work" },
  { key: "IDENTITY_CONCERN", label: "Identity concern" },
  { key: "OTHER", label: "Other" },
];

export default function ReportUserScreen({ route, navigation }: any) {
  const { jobId, targetUserId } = route.params;
  const { theme } = useTheme();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api("/reports", { method: "POST", body: { jobId, targetUserId, reason, details: details || undefined } });
      Alert.alert(
        "Report filed",
        "Our team will review this. If the job was in progress, it's now on hold and any escrowed payment is frozen until we resolve it."
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Report a problem</ScreenTitle>
      <Text style={{ color: theme.textSecondary, marginBottom: spacing.lg }}>
        If you're in immediate danger, contact local emergency services first. This report goes to Idle's safety team.
      </Text>

      {REASONS.map((r) => (
        <TouchableOpacity
          key={r.key}
          onPress={() => setReason(r.key)}
          style={{
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: reason === r.key ? theme.primary : theme.surfaceAlt,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ color: reason === r.key ? theme.textInverse : theme.textPrimary, fontWeight: "600" }}>{r.label}</Text>
        </TouchableOpacity>
      ))}

      <Input label="Details (optional)" value={details} onChangeText={setDetails} placeholder="What happened?" multiline />

      <Button title="Submit report" variant="danger" onPress={submit} loading={submitting} disabled={!reason} />
    </ScrollView>
  );
}
