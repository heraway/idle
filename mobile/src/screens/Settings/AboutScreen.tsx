import React from "react";
import { Text, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Card, ListRow } from "../../components/UI";
import { getAppInfo } from "../../utils/appInfo";
import { spacing, typography } from "../../theme/theme";

export default function AboutScreen({ navigation }: any) {
  const { theme } = useTheme();
  const info = getAppInfo();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
      <Text style={[typography.h1, { color: theme.primary }]}>Idle</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: spacing.lg }]}>Version {info.version}</Text>

      <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Odd jobs, done nearby</Text>
      <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
        Idle connects people who need a hand with people nearby who have spare time. Post a job, workers bid their own price, and you track progress together until it's done — lawn mowing, cleaning, moving help, dog walking and everything in between.
      </Text>

      <Card style={{ paddingVertical: spacing.xs }}>
        <ListRow icon="document-text-outline" label="Terms of Service" onPress={() => navigation.navigate("LegalDoc", { doc: "terms" })} />
        <ListRow icon="lock-closed-outline" label="Privacy Policy" onPress={() => navigation.navigate("LegalDoc", { doc: "privacy" })} />
        <ListRow icon="heart-outline" label="Acknowledgements" onPress={() => navigation.navigate("Acknowledgements")} last />
      </Card>

      <Text style={[typography.caption, { color: theme.textSecondary, textAlign: "center", marginTop: spacing.lg }]}>Made by heraway · MIT licensed</Text>
    </ScrollView>
  );
}
