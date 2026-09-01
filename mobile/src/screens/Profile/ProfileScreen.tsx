import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Card, Badge, Button, ScreenTitle } from "../../components/UI";
import { spacing, typography, radius } from "../../theme/theme";

export default function ProfileScreen({ navigation }: any) {
  const { theme, preference, setPreference } = useTheme();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl }}>
      <ScreenTitle>Profile</ScreenTitle>

      <Card>
        <Text style={[typography.h2, { color: theme.textPrimary }]}>{user.firstName} {user.lastName}</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>{user.email}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
          <Badge label={`⭐ ${user.avgRating.toFixed(1)} (${user.ratingCount})`} tone="accent" />
          <Badge label={`👍 ${user.likesReceived} likes`} />
          <Badge
            label={user.verificationStatus === "VERIFIED" ? "ID Verified" : "Not ID Verified"}
            tone={user.verificationStatus === "VERIFIED" ? "success" : "neutral"}
          />
        </View>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Availability</Text>
        <Text style={[typography.body, { color: theme.textSecondary }]}>
          {user.hoursPerDayAvailable ? `${user.hoursPerDayAvailable} hours/day` : "Not set — add this so hirers know your availability."}
        </Text>
      </Card>

      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary, marginBottom: spacing.sm }]}>Identity verification</Text>
        <Text style={[typography.body, { color: theme.textSecondary, marginBottom: spacing.sm }]}>
          Some jobs (driving, in-home work, childcare) require you to be ID-verified before you can bid. Verify once, reuse everywhere.
        </Text>
        <Button title="Go to verification" variant="secondary" onPress={() => navigation.navigate("Verification")} />
      </Card>

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
        <Button title="Community Guidelines" variant="secondary" onPress={() => navigation.navigate("LegalDoc", { doc: "guidelines" })} />
      </Card>

      {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
        <Button title="Admin Dashboard" variant="accent" onPress={() => navigation.navigate("AdminDashboard")} style={{ marginBottom: spacing.md }} />
      )}

      <Button title="Log out" variant="danger" onPress={logout} />
    </ScrollView>
  );
}
