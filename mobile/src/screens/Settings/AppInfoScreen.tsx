import React, { useState } from "react";
import { Text, ScrollView, Alert } from "react-native";
import * as Updates from "expo-updates";
import { useTheme } from "../../context/ThemeContext";
import { Button, Card, SectionLabel } from "../../components/UI";
import { InfoRow } from "./parts";
import { getAppInfo } from "../../utils/appInfo";
import { spacing, typography } from "../../theme/theme";

export default function AppInfoScreen() {
  const { theme } = useTheme();
  const info = getAppInfo();
  const [checking, setChecking] = useState(false);

  const checkForUpdates = async () => {
    if (!Updates.isEnabled) {
      Alert.alert("Updates unavailable", "This build doesn't receive over-the-air updates (for example, it's a development build).");
      return;
    }
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert("You're up to date", "You already have the latest version of Idle.");
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert("Update ready", "Restart Idle to apply the update.", [
        { text: "Later", style: "cancel" },
        { text: "Restart now", onPress: () => Updates.reloadAsync() },
      ]);
    } catch (e: any) {
      Alert.alert("Couldn't check for updates", e.message || "Please try again later.");
    } finally {
      setChecking(false);
    }
  };

  const rows: [string, string][] = [
    ["App version", info.version],
    ["Native build", info.nativeBuild ?? "—"],
    ["Runtime version", info.runtimeVersion ?? "—"],
    ["Update channel", info.channel ?? "—"],
    ["Running", info.isEmbeddedLaunch ? "Version bundled in the app" : "Over-the-air update"],
    ["Update ID", info.updateId ?? "—"],
    ["Update published", info.updateCreatedAt ? new Date(info.updateCreatedAt).toLocaleString() : "—"],
    ["Platform", `${info.platform} ${info.osVersion}`],
    ["Server", info.apiUrl],
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
      <SectionLabel>Build</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {rows.map(([label, value], i) => (
          <InfoRow key={label} label={label} value={value} last={i === rows.length - 1} />
        ))}
      </Card>
      <Button title="Check for updates" variant="secondary" onPress={checkForUpdates} loading={checking} style={{ marginTop: spacing.md }} />
      <Text style={[typography.caption, { color: theme.textSecondary, marginTop: spacing.md }]}>
        Include these details if you contact us about a problem. They're also attached automatically to bug reports.
      </Text>
    </ScrollView>
  );
}
