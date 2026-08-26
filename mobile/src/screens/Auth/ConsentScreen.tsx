import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../../components/UI";
import { spacing, typography } from "../../theme/theme";

// Shown once, before account creation. Nothing here is decorative — this is
// the explicit, logged consent step referenced by acceptedTermsAt /
// acceptedTermsVersion on the backend. The checkbox must be ticked to
// continue; declining exits back to the welcome screen instead of the app.
export default function ConsentScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xxl }}>
        <Text style={[typography.h1, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Before you join Idle</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.lg }]}>
          Idle connects people who need everyday work done with people willing to do it. A few things to know first:
        </Text>

        {[
          "Idle is a marketplace, not an employer. Workers are independent — Idle does not supervise the work itself.",
          "Payments are held in escrow and only released once you confirm a job is complete.",
          "Some jobs may require ID verification of applicants, at the hirer's request, for safety.",
          "Report any unsafe situation immediately — see Safety Center in Settings once you're in.",
        ].map((point, i) => (
          <View key={i} style={{ flexDirection: "row", marginBottom: spacing.sm }}>
            <Text style={{ color: theme.primary, marginRight: 8 }}>•</Text>
            <Text style={[typography.body, { color: theme.textPrimary, flex: 1 }]}>{point}</Text>
          </View>
        ))}

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
          <Text style={[typography.body, { color: theme.textSecondary }]}>
            Please read the{" "}
            <Text style={{ color: theme.primary, fontWeight: "600" }} onPress={() => navigation.navigate("LegalDoc", { doc: "terms" })}>
              Terms of Service
            </Text>
            , {" "}
            <Text style={{ color: theme.primary, fontWeight: "600" }} onPress={() => navigation.navigate("LegalDoc", { doc: "privacy" })}>
              Privacy Policy
            </Text>{" "}
            and{" "}
            <Text style={{ color: theme.primary, fontWeight: "600" }} onPress={() => navigation.navigate("LegalDoc", { doc: "waiver" })}>
              Liability Waiver
            </Text>
            .
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setAgreed(!agreed)}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xl }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: theme.primary,
              backgroundColor: agreed ? theme.primary : "transparent",
              marginRight: spacing.sm,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {agreed && <Text style={{ color: theme.textInverse, fontWeight: "700" }}>✓</Text>}
          </View>
          <Text style={[typography.bodyBold, { color: theme.textPrimary, flex: 1 }]}>
            I have read and agree to the Terms of Service, Privacy Policy, and Liability Waiver.
          </Text>
        </TouchableOpacity>

        <Button
          title="Continue"
          disabled={!agreed}
          onPress={() => navigation.navigate("Register", { acceptedTerms: true })}
        />
        <Button title="Not now" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </View>
  );
}
