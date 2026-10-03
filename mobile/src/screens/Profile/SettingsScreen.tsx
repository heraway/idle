import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Card, ListRow, SectionLabel } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

const LEGAL: { doc: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { doc: "terms", label: "Terms of Service", icon: "document-text-outline" },
  { doc: "privacy", label: "Privacy Policy", icon: "lock-closed-outline" },
  { doc: "waiver", label: "Liability Waiver", icon: "shield-outline" },
  { doc: "id-consent", label: "ID Verification Consent", icon: "id-card-outline" },
  { doc: "guidelines", label: "Community Guidelines", icon: "people-outline" },
];

export default function SettingsScreen({ navigation }: any) {
  const { theme, preference, setPreference } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      <SectionLabel>Appearance</SectionLabel>
      <Card>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["dark", "light", "system"] as const).map((p) => {
            const active = preference === p;
            const icon = p === "dark" ? "moon" : p === "light" ? "sunny" : "phone-portrait-outline";
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPreference(p)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  height: 64,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  backgroundColor: active ? theme.accentSoft : theme.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                }}
              >
                <Ionicons name={icon as any} size={20} color={active ? theme.primary : theme.textSecondary} />
                <Text style={{ color: active ? theme.primary : theme.textSecondary, fontWeight: "700", fontSize: 12, textTransform: "capitalize" }}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <SectionLabel>Account & security</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="key-outline" label="Change password" onPress={() => navigation.navigate("ChangePassword")} />
        <ListRow icon="shield-checkmark-outline" label="Identity verification" subtitle="Verify once, bid on any job" onPress={() => navigation.navigate("Verification")} last />
      </Card>

      <SectionLabel>Legal</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {LEGAL.map((l, i) => (
          <ListRow key={l.doc} icon={l.icon} label={l.label} onPress={() => navigation.navigate("LegalDoc", { doc: l.doc })} last={i === LEGAL.length - 1} />
        ))}
      </Card>

      <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginTop: spacing.md }]}>Idle · v1.0.0</Text>
    </ScrollView>
  );
}
