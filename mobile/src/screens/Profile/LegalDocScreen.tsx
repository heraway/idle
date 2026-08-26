import React from "react";
import { ScrollView, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { spacing, typography } from "../../theme/theme";

// Renders the plain-text legal docs bundled from /LEGAL at the repo root.
// For a real build, either bundle these .md files as assets and load them,
// or fetch them from your backend/CMS so they can be updated without an
// app store release. This stub shows the wiring; drop in the real content.
const TITLES: Record<string, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  waiver: "Liability Waiver",
  guidelines: "Community Guidelines",
};

export default function LegalDocScreen({ route }: any) {
  const { doc } = route.params;
  const { theme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.md }]}>{TITLES[doc] || "Legal"}</Text>
      <Text style={[typography.body, { color: theme.textSecondary }]}>
        See /LEGAL/{doc === "terms" ? "TERMS_OF_SERVICE" : doc === "privacy" ? "PRIVACY_POLICY" : doc === "waiver" ? "LIABILITY_WAIVER" : "COMMUNITY_GUIDELINES"}.md
        in the repo for the full drafted text. Wire this screen to load that file (as a bundled asset or from the backend) to display it here in production.
      </Text>
    </ScrollView>
  );
}
