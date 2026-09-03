import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Card, Button, ScreenTitle } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

// Everything that used to clutter the main Profile screen lives here now:
// Appearance, Account & Security, and all Legal document links. Profile
// stays focused on identity/trust info; this is where the "settings-y"
// stuff goes.
export default function SettingsScreen({ navigation }: any) {
  const { theme, preference, setPreference } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Settings</ScreenTitle>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Appearance</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["light", "dark", "system"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPreference(p)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: radius.md,
                alignItems: "center",
                backgroundColor: preference === p ? theme.primary : theme.chipBackground,
              }}
            >
              <Text style={{ color: preference === p ? theme.textInverse : theme.chipText, fontWeight: "600", textTransform: "capitalize" }}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Account & Security</Text>
        <Button title="Change Password" variant="secondary" onPress={() => navigation.navigate("ChangePassword")} />
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Legal</Text>
        <Button title="Terms of Service" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "terms" })} style={{ marginBottom: spacing.sm }} />
        <Button title="Privacy Policy" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "privacy" })} style={{ marginBottom: spacing.sm }} />
        <Button title="Liability Waiver" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "waiver" })} style={{ marginBottom: spacing.sm }} />
        <Button title="ID Verification Consent" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "id-consent" })} style={{ marginBottom: spacing.sm }} />
        <Button title="Community Guidelines" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "guidelines" })} />
      </Card>
    </ScrollView>
  );
}
