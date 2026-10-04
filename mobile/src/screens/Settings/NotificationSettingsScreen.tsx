import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert, Linking, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../api/client";
import { Button, Card, SectionLabel } from "../../components/UI";
import { SwitchRow } from "./parts";
import { spacing, typography } from "../../theme/theme";

interface Prefs {
  push: boolean;
  bids: boolean;
  jobs: boolean;
  questions: boolean;
}

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loadError, setLoadError] = useState("");
  const [osGranted, setOsGranted] = useState<boolean | null>(null);

  const checkPermission = useCallback(async () => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setOsGranted(p.status === "granted");
    } catch {
      setOsGranted(null);
    }
  }, []);

  useEffect(() => {
    api<{ notificationPrefs: Prefs }>("/users/me/settings")
      .then((r) => setPrefs(r.notificationPrefs))
      .catch((e) => setLoadError(e.message || "Couldn't load your notification settings"));
    checkPermission();
    // Re-check when the person comes back from the device's settings app.
    const sub = AppState.addEventListener("change", (s) => s === "active" && checkPermission());
    return () => sub.remove();
  }, [checkPermission]);

  const change = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value }); // optimistic; reverted below if the server rejects it
    try {
      const r = await api<{ notificationPrefs: Prefs }>("/users/me/settings", {
        method: "PATCH",
        body: { notificationPrefs: { [key]: value } },
      });
      setPrefs(r.notificationPrefs);
    } catch (e: any) {
      setPrefs(previous);
      Alert.alert("Couldn't save", e.message || "Please try again.");
    }
  };

  if (loadError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: spacing.lg }}>
        <Text style={{ color: theme.danger }}>{loadError}</Text>
      </View>
    );
  }
  if (!prefs) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      {osGranted === false ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={{ color: theme.textPrimary, fontWeight: "700", marginBottom: 4 }}>Notifications are blocked on this device</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: spacing.md }}>
            Your phone's settings are stopping Idle from showing notifications. Allow them there, then restart Idle so this device can register.
          </Text>
          <Button title="Open device settings" variant="secondary" onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}

      <SectionLabel>Push notifications</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <SwitchRow label="Allow push notifications" subtitle="Master switch for everything below" value={prefs.push} onValueChange={(v) => change("push", v)} last />
      </Card>

      <SectionLabel>What to notify me about</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <SwitchRow label="Bids" subtitle="New bids on your jobs, and when your bid is accepted" value={prefs.bids} disabled={!prefs.push} onValueChange={(v) => change("bids", v)} />
        <SwitchRow label="Job updates" subtitle="When a job is marked complete or cancelled" value={prefs.jobs} disabled={!prefs.push} onValueChange={(v) => change("jobs", v)} />
        <SwitchRow label="Questions" subtitle="New questions on your jobs, and answers to yours" value={prefs.questions} disabled={!prefs.push} onValueChange={(v) => change("questions", v)} last />
      </Card>

      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: spacing.md, lineHeight: 18 }]}>
        Chat messages don't send push notifications yet, so there is no setting for them.
      </Text>
    </ScrollView>
  );
}
