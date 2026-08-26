import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Card, Badge, ScreenTitle } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

export default function VerificationScreen() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<string>("NOT_REQUESTED");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await api<{ verificationStatus: string }>("/verification/status");
    setStatus(res.verificationStatus);
  };

  useEffect(() => {
    load();
  }, []);

  const start = async () => {
    setLoading(true);
    try {
      const res = await api<{ sessionUrl: string }>("/verification/start", { method: "POST", body: { consentGiven: true } });
      // In production this opens the provider's hosted capture flow.
      // Your ID photo is uploaded there directly — never to Idle's servers.
      Alert.alert("Verification started", "In the full app this opens a secure ID capture flow. This demo build uses a mock provider.");
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  // Dev-only helper to simulate the provider approving/rejecting — mirrors
  // the /verification/mock-complete route, which is disabled in production.
  const mockComplete = async (approve: boolean) => {
    try {
      await api("/verification/mock-complete", { method: "POST", body: { approve } });
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Identity verification</ScreenTitle>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Current status</Text>
        <Badge
          label={status.replace("_", " ")}
          tone={status === "VERIFIED" ? "success" : status === "REJECTED" ? "danger" : status === "PENDING" ? "warning" : "neutral"}
        />
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Why verify?</Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          Some hirers require applicants to be ID-verified before bidding — usually for jobs involving their home, their
          children, or driving. This protects both sides: it deters bad actors, and gives everyone a real identity on
          record in case something goes wrong.
        </Text>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>How it works</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          You'll be asked to photograph a government ID and take a selfie, using a secure third-party verification
          provider. Idle never stores your ID image or number — only a verified/not-verified flag.
        </Text>
        <Button title={status === "VERIFIED" ? "Re-verify" : "Start verification"} onPress={start} loading={loading} />
      </Card>

      {__DEV__ && (
        <Card>
          <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
            DEV TOOLS — simulate the provider's response (disabled in production builds)
          </Text>
          <Button title="Simulate: Approve" variant="secondary" onPress={() => mockComplete(true)} style={{ marginBottom: spacing.sm }} />
          <Button title="Simulate: Reject" variant="secondary" onPress={() => mockComplete(false)} />
        </Card>
      )}
    </ScrollView>
  );
}
