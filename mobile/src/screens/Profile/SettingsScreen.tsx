import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Button, Card, ListRow, SectionLabel } from "../../components/UI";
import { getAppInfo } from "../../utils/appInfo";
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
  const { logout } = useAuth();
  const { t } = useLanguage();

  const confirmLogout = () =>
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.logout"), style: "destructive", onPress: () => logout() },
    ]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      <SectionLabel>{t("settings.appearance")}</SectionLabel>
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

      <SectionLabel>{t("settings.preferences")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="language-outline" label={t("settings.language")} onPress={() => navigation.navigate("Language")} />
        <ListRow icon="notifications-outline" label={t("settings.notifications")} onPress={() => navigation.navigate("NotificationSettings")} />
        <ListRow icon="accessibility-outline" label={t("settings.accessibility")} onPress={() => navigation.navigate("Accessibility")} last />
      </Card>

      <SectionLabel>{t("settings.accountSecurity")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="key-outline" label={t("settings.changePassword")} onPress={() => navigation.navigate("ChangePassword")} />
        <ListRow icon="shield-checkmark-outline" label={t("settings.identity")} subtitle={t("settings.identitySub")} onPress={() => navigation.navigate("Verification")} last />
      </Card>

      <SectionLabel>{t("settings.helpSupport")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="help-circle-outline" label={t("settings.help")} onPress={() => navigation.navigate("Help")} />
        <ListRow icon="alert-circle-outline" label={t("settings.reportProblem")} onPress={() => navigation.navigate("SupportForm", { type: "PROBLEM" })} />
        <ListRow icon="person-remove-outline" label={t("settings.reportUser")} onPress={() => navigation.navigate("ReportUserPicker")} />
        <ListRow icon="bug-outline" label={t("settings.reportBug")} onPress={() => navigation.navigate("SupportForm", { type: "BUG" })} />
        <ListRow icon="chatbubble-ellipses-outline" label={t("settings.sendFeedback")} onPress={() => navigation.navigate("SupportForm", { type: "FEEDBACK" })} last />
      </Card>

      <SectionLabel>{t("settings.legal")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        {LEGAL.map((l, i) => (
          <ListRow key={l.doc} icon={l.icon} label={l.label} onPress={() => navigation.navigate("LegalDoc", { doc: l.doc })} last={i === LEGAL.length - 1} />
        ))}
      </Card>

      <SectionLabel>{t("settings.about")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="information-circle-outline" label={t("settings.aboutIdle")} onPress={() => navigation.navigate("About")} />
        <ListRow icon="heart-outline" label={t("settings.acknowledgements")} onPress={() => navigation.navigate("Acknowledgements")} />
        <ListRow icon="construct-outline" label={t("settings.appInfo")} onPress={() => navigation.navigate("AppInfo")} last />
      </Card>

      <SectionLabel>{t("settings.account")}</SectionLabel>
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="trash-outline" label={t("settings.deleteAccount")} tone="danger" onPress={() => navigation.navigate("DeleteAccount")} last />
      </Card>

      <Button title={t("settings.logout")} variant="danger" icon="log-out-outline" onPress={confirmLogout} style={{ marginTop: spacing.lg }} />

      <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginTop: spacing.md }]}>Idle · v{getAppInfo().version}</Text>
    </ScrollView>
  );
}
